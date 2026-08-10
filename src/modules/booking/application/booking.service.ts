import { BookingSource, BookingStatus, CasualMatchStatus, NotificationType, PaymentMethod, PaymentStatus, PrismaClient, RefundStatus, YardStatus } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../../utils/app-error';
import { IBookingRepository } from '../domain/booking.repository';
import { CreateBookingDto, CreateOfflineBookingDto } from '../dto/booking.dto';
import { EmailService } from '../infrastructure/email.service';
import { RefundService } from '../../payment/application/refund.service';
import { VNPayService } from '../../payment/application/vnpay.service';
import { format } from 'date-fns';
import { Env } from '@/config/env.config';

export class BookingService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaClient,
    private readonly refundService?: RefundService,
  ) {}

  private validateCutoffTime(bookingDate: string, startTime: string) {
    const bookingStart = new Date(`${bookingDate}T${startTime}:00+07:00`);
    const rawCutoff = Number(Env.CUTOFF_MINUTES || 3600000);
    const cutoffMs = rawCutoff < 10000 ? rawCutoff * 60 * 1000 : rawCutoff;
    const cutoff = new Date(Date.now() + cutoffMs);
    if (bookingStart < cutoff) {
      throw new BadRequestException(
        'Chỉ được đặt sân trước giờ bắt đầu ít nhất 1 tiếng, vui lòng chọn khung giờ khác',
      );
    }
  }

  async createBooking(userId: string, data: CreateBookingDto) {
    const yard = await this.bookingRepository.findYardById(data.fieldYardId);
    if (!yard) throw new NotFoundException('Sân con không tồn tại');
    if (yard.status !== YardStatus.ACTIVE) {
      throw new BadRequestException('Sân hiện đang tạm ngưng hoạt động');
    }

    // Chỉ chặn slot đã qua thời điểm hiện tại
    const bookingStart = new Date(`${data.bookingDate}T${data.startTime}:00+07:00`);
    if (bookingStart < new Date()) {
      throw new BadRequestException('Không thể đặt sân cho khung giờ đã qua');
    }

    const priceRules = await this.bookingRepository.findPriceRules(data.fieldYardId, data.bookingDate);
    const totalPrice = this.calculateTotalPrice(data.startTime, data.endTime, priceRules);

    // createBooking chỉ xử lý VNPAY — tiền mặt chuyển sang createOfflineBooking
    const booking = await this.bookingRepository.createBookingWithLock({
      userId,
      fieldYardId: data.fieldYardId,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      endTime: data.endTime,
      totalPrice,
      note: data.note,
      source: BookingSource.ONLINE,
      status: BookingStatus.AWAITING_PAYMENT,
      expiresAt: new Date(Date.now() + Number(Env.LOCK_TTL_MINUTES)),
    });

    // Notify owner about new booking (fire-and-forget)
    this.prisma.fieldYard.findUnique({
      where: { id: data.fieldYardId },
      include: { footballField: true },
    }).then((yard) => {
      if (!yard?.footballField?.ownerId) return;
      const startH = data.startTime.slice(0, 5);
      const endH = data.endTime.slice(0, 5);
      return this.prisma.notification.create({
        data: {
          recipientId: yard.footballField.ownerId,
          actorId: userId,
          entityType: 'Booking',
          entityId: booking.id,
          type: 'BOOKING_CREATED' as any,
          title: 'Bạn có đơn đặt sân mới.',
          content: `Đơn đặt sân ${yard.footballField.name} ngày ${data.bookingDate} khung giờ ${startH}-${endH}.`,
          metadata: {
            bookingId: booking.id,
            bookingDate: data.bookingDate,
            timeSlot: `${startH}-${endH}`,
          } as any,
        },
      });
    }).catch(() => {});

    return booking;
  }

async createOfflineBooking(userId: string, fieldYardId: string, data: CreateOfflineBookingDto) {
    // Cho phép cả USER lẫn OWNER gọi — không kiểm tra ownerId nữa
    const yard = await this.bookingRepository.findYardById(fieldYardId);
    if (!yard) throw new NotFoundException('Sân con không tồn tại');
    if (yard.status !== YardStatus.ACTIVE) {
      throw new BadRequestException('Sân hiện đang tạm ngưng hoạt động');
    }

    // Chặn slot đã qua
    const bookingStart = new Date(`${data.bookingDate}T${data.startTime}:00+07:00`);
    if (bookingStart < new Date()) {
      throw new BadRequestException('Không thể đặt sân cho khung giờ đã qua');
    }

    // Tính giá thực từ price rules
    const priceRules = await this.bookingRepository.findPriceRules(fieldYardId, data.bookingDate);
    const totalPrice = this.calculateTotalPrice(data.startTime, data.endTime, priceRules);

    // Xây note: ưu tiên note của user, sau đó thông tin khách (owner tạo offline), cuối cùng default
    const contactInfo = [data.customerName, data.customerPhone].filter(Boolean).join(' - ');
    const note = data.note
      ? data.note
      : contactInfo
        ? `[Đặt ngoài] Khách: ${contactInfo}`
        : undefined;

    // expiresAt = startTime - 30 phút (thời điểm tự mở khoá nếu chưa xác nhận)
    const startDatetime = new Date(`${data.bookingDate}T${data.startTime}:00+07:00`);
    const lockedUntil = new Date(startDatetime.getTime() - 30 * 60 * 1000);
    const expiresAt = lockedUntil > new Date() ? lockedUntil : null;

    const booking = await this.bookingRepository.createBookingWithLock({
      userId,
      fieldYardId,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      endTime: data.endTime,
      totalPrice,
      note,
      source: BookingSource.OFFLINE,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      expiresAt,
    });

    // Notify owner về đơn tiền mặt mới (fire-and-forget)
    this.prisma.fieldYard.findUnique({
      where: { id: fieldYardId },
      include: { footballField: true },
    }).then((yard) => {
      if (!yard?.footballField?.ownerId) return;
      const startH = data.startTime.slice(0, 5);
      const endH = data.endTime.slice(0, 5);
      const unlockTime = expiresAt
        ? `${String(lockedUntil.getHours()).padStart(2, '0')}:${String(lockedUntil.getMinutes()).padStart(2, '0')}`
        : null;
      const content = unlockTime
        ? `Đơn tiền mặt tại sân ${yard.footballField.name} ngày ${data.bookingDate} khung giờ ${startH}-${endH}. Xác nhận khách đến trước ${unlockTime}, nếu không slot sẽ tự mở khoá.`
        : `Đơn tiền mặt tại sân ${yard.footballField.name} ngày ${data.bookingDate} khung giờ ${startH}-${endH}.`;
      return this.prisma.notification.create({
        data: {
          recipientId: yard.footballField.ownerId,
          actorId: userId,
          entityType: 'Booking',
          entityId: booking.id,
          type: 'BOOKING_CREATED' as any,
          title: 'Đơn đặt sân tiền mặt mới.',
          content,
          metadata: {
            bookingId: booking.id,
            bookingDate: data.bookingDate,
            timeSlot: `${startH}-${endH}`,
            ...(unlockTime ? { unlockTime } : {}),
          } as any,
        },
      });
    }).catch(() => {});

    return booking;
  }
  /**
   * Cancel a booking (>1h before start time limit)
   * - If UNPAID: sets status = CANCELLED
   * - If PAID: triggers VNPay mock refund, sets status = CANCELLED & paymentStatus = REFUNDED, creates Refund record and Notification
   */
  async confirmArrival(ownerId: string, bookingId: string) {
    const booking = await this.bookingRepository.findWithDetails(bookingId);
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt sân');
    if (booking.source !== BookingSource.OFFLINE) throw new ForbiddenException('Chỉ áp dụng cho đơn đặt ngoài');
    if (booking.status !== BookingStatus.PENDING) throw new BadRequestException('Đơn đặt sân không ở trạng thái chờ');
    if ((booking as any).customerArrivedAt) throw new BadRequestException('Khách đã được xác nhận trước đó');
    if (!booking.expiresAt) throw new BadRequestException('Slot đã được mở khoá, hãy xác nhận lại');
    if (booking.fieldYard?.footballField?.ownerId !== ownerId) throw new ForbiddenException('Bạn không có quyền thao tác');

    const updated = await this.bookingRepository.confirmArrival(bookingId);

    // Notify owner xác nhận thành công (fire-and-forget)
    const startTime = new Date(booking.startTime);
    const startH = `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')}`;
    this.prisma.notification.create({
      data: {
        recipientId: ownerId,
        actorId: ownerId,
        entityType: 'Booking',
        entityId: bookingId,
        type: 'OFFLINE_ARRIVAL_CONFIRM' as any,
        title: 'Đã xác nhận khách đến sân',
        content: `Khách đã đến, slot ${startH} ngày ${format(new Date(booking.bookingDate), 'dd/MM/yyyy')} tiếp tục được giữ.`,
        metadata: { bookingId } as any,
      },
    }).catch(() => {});

    return { success: true, message: 'Xác nhận khách đến thành công', data: updated };
  }

  async reclaimBooking(ownerId: string, bookingId: string) {
    const booking = await this.bookingRepository.findWithDetails(bookingId);
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt sân');
    if (booking.source !== BookingSource.OFFLINE) throw new ForbiddenException('Chỉ áp dụng cho đơn đặt ngoài');
    if (booking.status !== BookingStatus.PENDING) throw new BadRequestException('Đơn đặt sân không ở trạng thái chờ');
    if ((booking as any).customerArrivedAt) throw new BadRequestException('Khách đã được xác nhận trước đó');
    if (booking.expiresAt) throw new BadRequestException('Slot chưa được mở khoá, hãy dùng Xác nhận đến sân');
    if (booking.fieldYard?.footballField?.ownerId !== ownerId) throw new ForbiddenException('Bạn không có quyền thao tác');

    // Kiểm tra chưa qua giờ bắt đầu
    const bookingDateStr = format(new Date(booking.bookingDate), 'yyyy-MM-dd');
    const startUtc = new Date(booking.startTime);
    const startH = `${String(startUtc.getUTCHours()).padStart(2, '0')}:${String(startUtc.getUTCMinutes()).padStart(2, '0')}`;
    const endUtc = new Date((booking as any).endTime);
    const endH = `${String(endUtc.getUTCHours()).padStart(2, '0')}:${String(endUtc.getUTCMinutes()).padStart(2, '0')}`;
    const matchStart = new Date(`${bookingDateStr}T${startH}:00+07:00`);
    if (new Date() >= matchStart) throw new BadRequestException('Đã qua giờ bắt đầu, không thể xác nhận slot');

    const updated = await this.bookingRepository.reclaimBooking({
      bookingId,
      fieldYardId: booking.fieldYardId,
      bookingDate: bookingDateStr,
      startTime: startH,
      endTime: endH,
    });

    // Notify owner (fire-and-forget)
    this.prisma.notification.create({
      data: {
        recipientId: ownerId,
        actorId: ownerId,
        entityType: 'Booking',
        entityId: bookingId,
        type: 'OFFLINE_ARRIVAL_CONFIRM' as any,
        title: 'Đã xác nhận slot thành công',
        content: `Khách đã đến trễ nhưng slot ${startH} ngày ${format(new Date(booking.bookingDate), 'dd/MM/yyyy')} vẫn còn trống và đã được giữ lại.`,
        metadata: { bookingId } as any,
      },
    }).catch(() => {});

    return { success: true, message: 'Claim lại slot thành công', data: updated };
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await this.bookingRepository.findWithDetails(bookingId);

    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt sân');
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền huỷ đơn này');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Đơn đặt sân đã được huỷ trước đó');
    }

    if (booking.casualMatch && booking.casualMatch.status !== CasualMatchStatus.CANCELLED) {
      throw new BadRequestException('Đơn đặt sân này đang có trận vãng lai được tạo, không được phép hủy.');
    }

    // Cutoff validation: matchStart > 1h from now
    const bookingDateStr = format(new Date(booking.bookingDate), 'yyyy-MM-dd');
    const startTimeDate = new Date(booking.startTime);
    const hours = String(startTimeDate.getUTCHours()).padStart(2, '0');
    const minutes = String(startTimeDate.getUTCMinutes()).padStart(2, '0');
    const matchStart = new Date(`${bookingDateStr}T${hours}:${minutes}:00Z`);

    const now = new Date();
    const cutoffTime = new Date(matchStart.getTime() - 60 * 60 * 1000);

    if (now > cutoffTime) {
      throw new BadRequestException('Không thể hủy booking trước giờ thi đấu dưới 1 giờ.');
    }

    const isPaid = booking.paymentStatus === PaymentStatus.PAID;
    let refundTransactionNo: string | undefined;
    let refundedAt: Date | undefined;

    if (isPaid) {
      const vnpayService = new VNPayService();
      const refundRes = await vnpayService.refundPayment({
        txnRef: bookingId,
        amount: Number(booking.totalPrice),
        reason,
      });
      if (refundRes.success) {
        refundTransactionNo = refundRes.refundTransactionNo;
        refundedAt = refundRes.refundedAt;
      }
    }

    const updatedBooking = await this.bookingRepository.cancelBookingWithTransaction({
      bookingId,
      userId,
      reason,
      isPaid,
      refundTransactionNo,
      refundedAt,
    });

    return {
      success: true,
      message: 'Hủy đặt sân thành công',
      data: updatedBooking,
    };
  }

  private calculateTotalPrice(
    start: string,
    end: string,
    rules: any[],
  ): number {
    const startTimeObj = new Date(`1970-01-01T${start}:00Z`);
    const endTimeObj = new Date(`1970-01-01T${end}:00Z`);

    const matchingRule = rules.find((rule) => {
      const ruleStart = new Date(rule.timeSlot.startTime);
      const ruleEnd = new Date(rule.timeSlot.endTime);
      return startTimeObj >= ruleStart && endTimeObj <= ruleEnd;
    });

    if (!matchingRule) {
      return 100000;
    }

    return Number(matchingRule.price);
  }

  async getMyBookings(userId: string, filter: any) {
    return await this.bookingRepository.findByUserId(userId, filter);
  }

  async getBookingById(id: string) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }
    return booking;
  }

  async getOwnerBookings(ownerId: string, filter: any) {
    return await this.bookingRepository.findByOwnerId(ownerId, filter);
  }

  async countTotalBookingByOwner(ownerId: string) {
    return await this.bookingRepository.countTotalBookingByOwner(ownerId);
  }

  async getBookingByDate(date: Date, page: number, limit: number) {
    return await this.bookingRepository.findBookingByDate(date, page, limit);
  }

  async countBookingByDate(date: Date) {
    return await this.bookingRepository.countBookingByDate(date);
  }

  async getBookingsForCreateCasual(userId: string) {
    return await this.bookingRepository.findEligibleForCasualMatch(userId);
  }

  async ownerCancelBooking(ownerId: string, bookingId: string, reason: string) {
    const booking = await this.bookingRepository.findWithDetails(bookingId);
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt sân');

    // Verify owner owns this field
    if (booking.fieldYard?.footballField?.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn đặt sân này');
    }

    // Only CONFIRMED or PENDING bookings can be owner-cancelled
    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể hủy đơn đặt sân đang ở trạng thái CONFIRMED hoặc PENDING');
    }

    const isPaid = booking.paymentStatus === PaymentStatus.PAID;

    // Get owner info for notification/email
    const ownerUser = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { firstName: true, lastName: true, email: true },
    });
    const ownerName = ownerUser
      ? `${ownerUser.firstName} ${ownerUser.lastName}`
      : 'Chủ sân';

    const updatedBooking = await this.bookingRepository.ownerCancelBooking({
      bookingId,
      ownerId,
      ownerName,
      reason,
      isPaid,
    });

    // Send email to user (fire-and-forget, non-blocking)
    const userWithEmail = (updatedBooking as any).user;
    if (userWithEmail?.email) {
      const fieldYard = (updatedBooking as any).fieldYard;
      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);
      const timeSlot = `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(startTime.getUTCMinutes()).padStart(2, '0')} - ${String(endTime.getUTCHours()).padStart(2, '0')}:${String(endTime.getUTCMinutes()).padStart(2, '0')}`;

      this.emailService.sendOwnerCancelBookingEmail(userWithEmail.email, {
        userName: `${userWithEmail.firstName ?? ''} ${userWithEmail.lastName ?? ''}`.trim() || userWithEmail.username,
        fieldName: fieldYard?.footballField?.name ?? 'Sân bóng',
        yardName: fieldYard?.name ?? '',
        bookingDate: format(new Date(booking.bookingDate), 'dd/MM/yyyy'),
        timeSlot,
        cancelledBy: ownerName,
        cancelledAt: format(new Date(), 'dd/MM/yyyy HH:mm'),
        reason,
        isPaid,
      }).catch(() => {
        // ponytail: email failure must not break the cancel flow
      });
    }

    return {
      success: true,
      message: 'Hủy đặt sân thành công',
      data: updatedBooking,
    };
  }

  async getOwnerRevenueStats(ownerId: string, year?: number) {
    return await this.bookingRepository.getOwnerRevenueStats(ownerId, year);
  }
}
