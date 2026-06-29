import { NextFunction, Request, Response } from 'express';
import { RefundService } from './refund.service';

export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  async getRefundByBookingId(req: Request, res: Response, _next: NextFunction) {
    const bookingId = req.params.bookingId as string;
    const refund = await this.refundService.getRefundByBookingId(bookingId);
    return res.status(200).json({ message: 'Thông tin hoàn tiền', data: refund });
  }

  async confirmRefund(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const { adminNote } = req.body;
    const refund = await this.refundService.confirmRefund(id, adminNote);
    return res.status(200).json({ message: 'Xác nhận hoàn tiền thành công', data: refund });
  }
}
