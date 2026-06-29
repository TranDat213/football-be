import { PaymentStatus, PrismaClient } from '@prisma/client';
import { NotFoundException, BadRequestException } from '../../../utils/app-error';
import { EmailService } from '../../booking/infrastructure/email.service';
import { VNPayService } from './vnpay.service';
import { format } from 'date-fns';

export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly vnpayService: VNPayService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Called by IPN handler. Idempotent: guards against duplicate processing.
   */
  async completeVNPayPayment(bookingId: string, vnpParams: any): Promise<{ alreadyProcessed: boolean }> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Get booking with lock
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          fieldYard: { include: { footballField: true } },
          payment: true,
        },
      });

      if (!booking) throw new NotFoundException('Booking not found');

      // 2. Idempotency guard — if already paid, return early
      if (booking.payment && booking.payment.status === PaymentStatus.PAID) {
        return { alreadyProcessed: true };
      }

      // 3. Update booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: PaymentStatus.PAID,
        },
      });

      // 4. Create or update payment record
      await tx.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          transactionCode: vnpParams['vnp_TransactionNo'] as string,
          paymentMethod: 'VNPAY',
          amount: Number(booking.totalPrice),
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayResponse: vnpParams,
        },
        update: {
          transactionCode: vnpParams['vnp_TransactionNo'] as string,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayResponse: vnpParams,
        },
      });

      // 5. Create Commission (10%) if not exists
      const existingCommission = await tx.commission.findUnique({ where: { bookingId } });
      if (!existingCommission) {
        await tx.commission.create({
          data: {
            bookingId,
            amount: Number(booking.totalPrice) * 0.1,
            percentage: 10,
          },
        });
      }

      // 6. Send email asynchronously (don't block)
      this.emailService
        .sendBookingConfirmation(booking.user.email, {
          bookingId: booking.id,
          userName: `${booking.user.firstName} ${booking.user.lastName}`,
          yardName: `${booking.fieldYard.footballField.name} - ${booking.fieldYard.name}`,
          date: format(booking.bookingDate, 'dd/MM/yyyy'),
          time: `${format(booking.startTime, 'HH:mm')} - ${format(booking.endTime, 'HH:mm')}`,
          totalPrice: Number(booking.totalPrice),
        })
        .catch((err) => console.error('Failed to send confirmation email:', err));

      return { alreadyProcessed: false };
    });
  }

  /**
   * Verify VNPay return URL signature — does NOT update DB (IPN already did that).
   * Used by the frontend payment result page to display outcome.
   */
  handleReturnUrl(query: any): {
    success: boolean;
    responseCode: string;
    bookingId: string;
    amount: number;
    message: string;
  } {
    const isValid = this.vnpayService.verifyChecksum(query);

    if (!isValid) {
      return {
        success: false,
        responseCode: '97',
        bookingId: query['vnp_TxnRef'] as string,
        amount: 0,
        message: 'Xác minh chữ ký thất bại',
      };
    }

    const responseCode = query['vnp_ResponseCode'] as string;
    const bookingId = query['vnp_TxnRef'] as string;
    const amount = Number(query['vnp_Amount']) / 100; // VNPay sends amount * 100

    if (responseCode === '00') {
      return { success: true, responseCode, bookingId, amount, message: 'Thanh toán thành công' };
    }

    return { success: false, responseCode, bookingId, amount, message: 'Thanh toán thất bại hoặc bị huỷ' };
  }

  /**
   * Get payment details for a specific booking.
   */
  async getPaymentByBookingId(bookingId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            fieldYard: { include: { footballField: { select: { name: true, address: true } } } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Không tìm thấy thông tin thanh toán');

    return payment;
  }

  /**
   * Admin: list all payments with pagination and optional filters.
   */
  async getAllPaymentsAdmin(filter: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.status) {
      where.status = filter.status as PaymentStatus;
    }

    if (filter.search) {
      where.OR = [
        { transactionCode: { contains: filter.search, mode: 'insensitive' } },
        { bookingId: { contains: filter.search, mode: 'insensitive' } },
        { booking: { user: { email: { contains: filter.search, mode: 'insensitive' } } } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
              fieldYard: { include: { footballField: { select: { name: true } } } },
              refund: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
