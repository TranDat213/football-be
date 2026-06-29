import { NextFunction, Request, Response } from 'express';
import { VNPayService } from './vnpay.service';
import { PaymentService } from './payment.service';
import { BadRequestException } from '../../../utils/app-error';
import { BookingService } from '../../booking/application/booking.service';

export class PaymentController {
  constructor(
    private readonly vnpayService: VNPayService,
    private readonly paymentService: PaymentService,
    private readonly bookingService: BookingService,
  ) {}

  async createPayment(req: Request, res: Response, _next: NextFunction) {
    const { bookingId, paymentMethod } = req.body;
    const booking = await this.bookingService.getBookingById(bookingId);

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Đơn hàng đã được thanh toán hoặc không còn khả dụng');
    }

    if (paymentMethod === 'VNPAY') {
      const ip = req.ip || '127.0.0.1';
      const paymentUrl = this.vnpayService.createPaymentUrl(ip, booking.id, Number(booking.totalPrice));
      return res.status(200).json({ success: true, paymentUrl });
    }

    if (paymentMethod === 'CASH') {
      return res.status(200).json({ success: true, message: 'Vui lòng thanh toán tại quầy' });
    }

    return res.status(200).json({ success: true, message: `Phương thức ${paymentMethod} đang được phát triển` });
  }

  /**
   * VNPay IPN handler — called server-to-server by VNPay.
   * Idempotent: delegates to PaymentService which guards duplicate processing.
   */
  async handleVNPayIPN(req: Request, res: Response, _next: NextFunction) {
    const vnp_Params = req.query;
    const isValid = this.vnpayService.verifyChecksum(vnp_Params);

    if (!isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }

    const bookingId = vnp_Params['vnp_TxnRef'] as string;
    const responseCode = vnp_Params['vnp_ResponseCode'];

    if (responseCode === '00') {
      const result = await this.paymentService.completeVNPayPayment(bookingId, vnp_Params);

      if (result.alreadyProcessed) {
        return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    }

    return res.status(200).json({ RspCode: '00', Message: 'Payment Failed or Cancelled' });
  }

  /**
   * VNPay Return URL handler — browser redirect.
   * Verifies signature only; does NOT update DB.
   */
  async handleVNPayReturn(req: Request, res: Response, _next: NextFunction) {
    const result = this.paymentService.handleReturnUrl(req.query);
    return res.status(200).json({ success: result.success, data: result });
  }

  /**
   * GET /payments/:bookingId — authenticated user.
   */
  async getPaymentByBookingId(req: Request, res: Response, _next: NextFunction) {
    const bookingId = req.params.bookingId as string;
    const payment = await this.paymentService.getPaymentByBookingId(bookingId);
    return res.status(200).json({ message: 'Thông tin thanh toán', data: payment });
  }

  /**
   * GET /payments/admin/all — admin only.
   */
  async getAllPaymentsAdmin(req: Request, res: Response, _next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await this.paymentService.getAllPaymentsAdmin({ page, limit, status, search });
    return res.status(200).json({ message: 'Danh sách thanh toán', ...result });
  }
}
