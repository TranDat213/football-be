import { BookingStatus, PaymentStatus, PrismaClient } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../../utils/app-error';
import { IBookingRepository } from '../domain/booking.repository';
import { CreateBookingDto } from '../dto/booking.dto';
import { EmailService } from '../infrastructure/email.service';
import { RefundService } from '../../payment/application/refund.service';
import { format } from 'date-fns';

export class BookingService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaClient,
    private readonly refundService?: RefundService,
  ) {}

  async createBooking(userId: string, data: CreateBookingDto) {
    // ... existing logic
    const yard = await this.bookingRepository.findYardById(data.fieldYardId);
    if (!yard) {
      throw new NotFoundException('Sân con không tồn tại');
    }

    if (yard.status !== 'ACTIVE') {
      throw new BadRequestException('Sân hiện đang tạm ngưng hoạt động');
    }

    const isAvailable = await this.bookingRepository.checkAvailability(
      data.fieldYardId,
      data.bookingDate,
      data.startTime,
      data.endTime,
    );

    if (!isAvailable) {
      throw new BadRequestException(
        'Khung giờ này đã có người đặt, vui lòng chọn khung giờ khác',
      );
    }

    const priceRules = await this.bookingRepository.findPriceRules(
      data.fieldYardId,
      data.bookingDate,
    );
    const totalPrice = this.calculateTotalPrice(
      data.startTime,
      data.endTime,
      priceRules,
    );

    return await this.bookingRepository.create({
      ...data,
      userId,
      totalPrice,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
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

    // Update booking to cancelled
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason: reason ?? null,
      },
    });

    // If booking was paid, initiate refund process
    if (
      booking.paymentStatus === PaymentStatus.PAID &&
      this.refundService
    ) {
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
      const ruleStart = new Date(rule.startTime);
      const ruleEnd = new Date(rule.endTime);
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

  async getBookingByDate(date: Date,page:number, limit:number) {
    return await this.bookingRepository.findBookingByDate(date,page, limit);
  }

  async countBookingByDate(date: Date) {
    return await this.bookingRepository.countBookingByDate(date);
  }
}
