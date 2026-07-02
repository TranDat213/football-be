import { PaymentStatus } from '@prisma/client';
import { NotFoundException } from '../../../utils/app-error';
import { EmailService } from '../../booking/infrastructure/email.service';
import { VNPayService } from './vnpay.service';
import { format } from 'date-fns';
import { BookingRepository } from '../domain/repositories/booking.repository';
import { PaymentRepository } from '../domain/repositories/payment.repository';
import { CommissionRepository } from '../domain/repositories/commission.repository';
import { TransactionManager } from '../domain/repositories/transaction.manager';

export class PaymentService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly commissionRepository: CommissionRepository,
    private readonly vnpayService: VNPayService,
    private readonly emailService: EmailService,
    private readonly transactionManager: TransactionManager
  ) {}

  private async completeVNPayPayment(
    bookingId: string,
    vnpParams: any,
  ): Promise<{ alreadyProcessed: boolean }> {
    return await this.transactionManager.run(async (tx) => {
      // 1. Get booking with lock
      const booking = await this.bookingRepository.findByIdWithLock(bookingId, tx);
      if (!booking) throw new NotFoundException('Booking not found');

      // 2. Idempotency guard — if already paid, return early
      if (booking.payment && booking.payment.status === PaymentStatus.PAID) {
        return { alreadyProcessed: true };
      }

      // 3. Update booking status
      await this.bookingRepository.updateStatus(bookingId, 'CONFIRMED', PaymentStatus.PAID, tx);

      // 4. Create or update payment record
      await this.paymentRepository.upsertPayment(
        bookingId,
        {
          transactionCode: vnpParams['vnp_TransactionNo'] as string,
          paymentMethod: 'VNPAY',
          amount: Number(booking.totalPrice),
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          gatewayResponse: vnpParams,
        },
        tx
      );

      // 5. Create Commission (10%) if not exists
      const existingCommission = await this.commissionRepository.findByBookingId(bookingId, tx);
      if (!existingCommission) {
        await this.commissionRepository.create(
          {
            bookingId,
            amount: Number(booking.totalPrice) * 0.1,
            percentage: 10,
          },
          tx
        );
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
        .catch((err) =>
          console.error('Failed to send confirmation email:', err),
        );

      return { alreadyProcessed: false };
    });
  }

  async handleIPN(query: any): Promise<{ RspCode: string; Message: string }> {
    try {
      const isValid = this.vnpayService.verifyChecksum(query);
      if (!isValid) {
        return { RspCode: '97', Message: 'Invalid Checksum' };
      }

      const bookingId = query['vnp_TxnRef'] as string;
      const amount = Number(query['vnp_Amount']) / 100;
      
      const booking = await this.bookingRepository.findByIdWithLock(bookingId);
      if (!booking) {
        return { RspCode: '01', Message: 'Order not Found' };
      }

      if (Number(booking.totalPrice) !== amount) {
        return { RspCode: '04', Message: 'Invalid Amount' };
      }

      const responseCode = query['vnp_ResponseCode'] as string;
      const transactionStatus = query['vnp_TransactionStatus'] as string;

      if (responseCode === '00' && transactionStatus === '00') {
        await this.completeVNPayPayment(bookingId, query);
      }

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error) {
      console.error('IPN processing error:', error);
      return { RspCode: '99', Message: 'Unknown Error' };
    }
  }

  async handleReturnUrl(query: any): Promise<{
    success: boolean;
    responseCode: string;
    bookingId: string;
    amount: number;
    message: string;
  }> {
    const isValid = this.vnpayService.verifyChecksum(query);
    const bookingId = query['vnp_TxnRef'] as string;
    const amount = Number(query['vnp_Amount']) / 100;
    const responseCode = query['vnp_ResponseCode'] as string;

    if (!isValid) {
      return {
        success: false,
        responseCode: '97',
        bookingId,
        amount,
        message: 'Xác minh chữ ký thất bại',
      };
    }

    if (responseCode === '00') {
      return {
        success: true,
        responseCode,
        bookingId,
        amount,
        message: 'Thanh toán thành công',
      };
    }

    return {
      success: false,
      responseCode,
      bookingId,
      amount,
      message: 'Thanh toán thất bại hoặc bị huỷ',
    };
  }

  async getPaymentByBookingId(bookingId: string) {
    const payment = await this.paymentRepository.findByBookingId(bookingId);
    if (!payment) throw new NotFoundException('Không tìm thấy thông tin thanh toán');
    return payment;
  }

  async getAllPaymentsAdmin(filter: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    return await this.paymentRepository.findAllAdmin(filter);
  }
}
