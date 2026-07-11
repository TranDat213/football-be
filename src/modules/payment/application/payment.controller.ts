import { NextFunction, Request, Response } from 'express';
import { PaymentService } from './payment.service';

export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
  ) {}

  async createPayment(req: Request, res: Response, _next: NextFunction) {
    const { bookingId, paymentMethod } = req.body;
    const ip = req.ip || '127.0.0.1';

    const result = await this.paymentService.createPayment(bookingId, paymentMethod, ip);

    return res.status(200).json({ success: true, ...result });
  }
  /**
   * VNPay IPN handler — called server-to-server by VNPay.
   * Idempotent: delegates to PaymentService which guards duplicate processing.
   */
  async handleVNPayIPN(req: Request, res: Response, _next: NextFunction) {
    const result = await this.paymentService.handleIPN(req.query);
    return res.status(200).json(result); // VNPay expects standard JSON with RspCode/Message
  }

  /**
   * Browser redirect from VNPay (public, verify only)
   */
  async handleVNPayReturn(req: Request, res: Response, _next: NextFunction) {
    const result = await this.paymentService.handleReturnUrl(req.query);
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
