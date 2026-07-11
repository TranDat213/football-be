import { BookingSource, BookingStatus, PaymentMethod, PaymentStatus, PrismaClient, YardStatus } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../../utils/app-error';
import { IBookingRepository } from '../domain/booking.repository';
import { CreateBookingDto, CreateOfflineBookingDto } from '../dto/booking.dto';
import { EmailService } from '../infrastructure/email.service';
import { RefundService } from '../../payment/application/refund.service';
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
    const bookingStart = new Date(`${bookingDate}T${startTime}:00`);
    const cutoff = new Date(Date.now() + Number(Env.CUTOFF_MINUTES));
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

    this.validateCutoffTime(data.bookingDate, data.startTime);

    const priceRules = await this.bookingRepository.findPriceRules(data.fieldYardId, data.bookingDate);
    const totalPrice = this.calculateTotalPrice(data.startTime, data.endTime, priceRules);

    const requiresPrepayment = data.paymentMethod !== PaymentMethod.CASH;

    return await this.bookingRepository.createBookingWithLock({
      userId,
      fieldYardId: data.fieldYardId,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      endTime: data.endTime,
      totalPrice,
      note: data.note,
      source: BookingSource.ONLINE,
      // CASH -> đặt xong ngay, trả sau, khoá vĩnh viễn
      // Online -> giữ chỗ tạm 15 phút chờ thanh toán
      status: requiresPrepayment ? BookingStatus.AWAITING_PAYMENT : BookingStatus.PENDING,
      expiresAt: requiresPrepayment ? new Date(Date.now() + Number(Env.LOCK_TTL_MINUTES)) : null,
    });
  }

async createOfflineBooking(ownerId: string, fieldYardId: string, data: CreateOfflineBookingDto) {
    const yard = await this.bookingRepository.findYardWithOwnerById(fieldYardId);
    if (!yard) throw new NotFoundException('Sân con không tồn tại');
    
    const field = await this.bookingRepository.findFieldByFieldId(yard.footballFieldId);

    if (field?.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên sân này');
    }

    const contactInfo = [data.customerName, data.customerPhone].filter(Boolean).join(' - ');
    const note = contactInfo
      ? `[Đặt ngoài] Khách: ${contactInfo}`
      : '[Đặt ngoài] Chủ sân khoá lịch thủ công';

    return await this.bookingRepository.createBookingWithLock({
      userId: ownerId,
      fieldYardId,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      endTime: data.endTime,
      totalPrice: 0,
      note,
      source: BookingSource.OFFLINE,
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.UNPAID,
      expiresAt: null,
    });
  }
  /**
   * Cancel a booking. Validates the user owns it, then:
   * - Sets booking status = CANCELLED
   * - If paymentStatus = PAID, triggers refund creation (sets REFUND_PENDING)
   */
  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt sân');
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền huỷ đơn này');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Đơn đặt sân đã được huỷ trước đó');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason: reason ?? null,
      },
    });

    if (booking.paymentStatus === PaymentStatus.PAID && this.refundService) {
      await this.refundService.createRefund(bookingId, reason);
    }

    return { success: true, message: 'Huỷ đặt sân thành công' };
  }

  private calculateTotalPrice(
    start: string,
    end: string,
    rules: any[],
  ): number {
    // Logic: Find rule that covers the time range.
    // In a production system, this could be more complex (e.g., spanning multiple partial rules).
    // For simplicity, we find the first matching rule or return a default.
    const startTimeObj = new Date(`1970-01-01T${start}:00Z`);
    const endTimeObj = new Date(`1970-01-01T${end}:00Z`);

    const matchingRule = rules.find((rule) => {
      const ruleStart = new Date(rule.timeSlot.startTime);
      const ruleEnd = new Date(rule.timeSlot.endTime);
      return startTimeObj >= ruleStart && endTimeObj <= ruleEnd;
    });

    if (!matchingRule) {
      // Fallback price if no rules match
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
}
