import { NextFunction, Request, Response } from 'express';
import { VNPayService } from './vnpay.service';
import { BookingService } from '../../booking/application/booking.service';
import { BadRequestException } from '../../../utils/app-error';

export class PaymentController {
  constructor(
    private readonly vnpayService: VNPayService,
    private readonly bookingService: BookingService
  ) {}

  async createVNPayUrl(req: Request, res: Response, _next: NextFunction) {
    const { bookingId } = req.body;
    const booking = await this.bookingService.getBookingById(bookingId);

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Đơn hàng đã được thanh toán hoặc không còn khả dụng');
    }

    const ip = req.ip || '127.0.0.1';
    const paymentUrl = this.vnpayService.createPaymentUrl(ip, booking.id, Number(booking.totalPrice));

    return res.status(200).json({
      success: true,
      paymentUrl
    });
  }

  async handleVNPayIPN(req: Request, res: Response, _next: NextFunction) {
    const vnp_Params = req.query;
    const isValid = this.vnpayService.verifyChecksum(vnp_Params);

    if (!isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const bookingId = vnp_Params['vnp_TxnRef'] as string;
    const responseCode = vnp_Params['vnp_ResponseCode'];

    if (responseCode === '00') {
      // Success: Update DB
      // We'll need to implement completePayment in BookingService
      await (this.bookingService as any).completePayment(bookingId, vnp_Params);
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    }

    return res.status(200).json({ RspCode: '00', Message: 'Payment Failed or Cancelled' });
  }
}
