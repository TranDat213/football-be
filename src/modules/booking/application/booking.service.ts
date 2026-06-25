import { BookingStatus, PaymentStatus, PrismaClient } from '@prisma/client';
import {
  BadRequestException,
  NotFoundException,
} from '../../../utils/app-error';
import { IBookingRepository } from '../domain/booking.repository';
import { CreateBookingDto } from '../dto/booking.dto';
import { EmailService } from '../infrastructure/email.service';
import { format } from 'date-fns';

export class BookingService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaClient,
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

  async completePayment(bookingId: string, vnpParams: any) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Get booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          fieldYard: { include: { footballField: true } },
        },
      });

      if (!booking) throw new NotFoundException('Booking not found');

      // 2. Update Booking & Payment
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      await tx.payment.create({
        data: {
          bookingId: bookingId,
          transactionCode: vnpParams['vnp_TransactionNo'],
          paymentMethod: 'VNPAY',
          amount: Number(booking.totalPrice),
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayResponse: vnpParams,
        },
      });

      // 3. Create Commission (10%)
      await tx.commission.create({
        data: {
          bookingId,
          amount: Number(booking.totalPrice) * 0.1,
          percentage: 10,
        },
      });

      // 4. Send Email (Wait for background or do async)
      this.emailService
        .sendBookingConfirmation(booking.user.email, {
          bookingId: booking.id,
          userName: `${booking.user.firstName} ${booking.user.lastName}`,
          yardName: `${booking.fieldYard.footballField.name} - ${booking.fieldYard.name}`,
          date: format(booking.bookingDate, 'dd/MM/yyyy'),
          time: `${format(booking.startTime, 'HH:mm')} - ${format(booking.endTime, 'HH:mm')}`,
          totalPrice: Number(booking.totalPrice),
        })
        .catch((err) =>
          console.error('Failed to send confirmation email:', err),
        );

      return true;
    });
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
}
