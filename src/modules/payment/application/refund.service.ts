import { PaymentStatus, PrismaClient, RefundStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '../../../utils/app-error';

export class RefundService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates a Refund record and sets booking paymentStatus to REFUND_PENDING.
   * Only valid if the booking was previously PAID.
   */
  async createRefund(bookingId: string, reason?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true, refund: true },
      });

      if (!booking) throw new NotFoundException('Booking not found');

      if (booking.paymentStatus !== PaymentStatus.PAID) {
        // Booking was not paid — no refund needed
        return null;
      }

      // Prevent duplicate refund records
      if (booking.refund) {
        return booking.refund;
      }

      const refund = await tx.refund.create({
        data: {
          bookingId,
          paymentId: booking.payment?.id ?? null,
          amount: booking.totalPrice,
          reason: reason ?? null,
          status: RefundStatus.PENDING,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: PaymentStatus.REFUND_PENDING },
      });

      return refund;
    });
  }

  /**
   * Admin confirms a refund — marks it SUCCESS and updates booking paymentStatus to REFUNDED.
   */
  async confirmRefund(refundId: string, adminNote?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId } });

      if (!refund) throw new NotFoundException('Refund record not found');

      if (refund.status !== RefundStatus.PENDING) {
        throw new BadRequestException('Refund đã được xử lý trước đó');
      }

      const updatedRefund = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.SUCCESS,
          processedAt: new Date(),
          adminNote: adminNote ?? null,
        },
      });

      await tx.booking.update({
        where: { id: refund.bookingId },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });

      return updatedRefund;
    });
  }

  /**
   * Get refund record by bookingId.
   */
  async getRefundByBookingId(bookingId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: { id: true, totalPrice: true, status: true, paymentStatus: true },
        },
      },
    });

    if (!refund) throw new NotFoundException('Không tìm thấy thông tin hoàn tiền');

    return refund;
  }
}
