import { NextFunction, Request, Response } from 'express';
import { SettlementService } from './settlement.service';
import { PayoutStatus } from '@prisma/client';

export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  async getCommissions(req: Request, res: Response, _next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const commissions = await this.settlementService.getCommissions(page, limit);
    return res.status(200).json({ success: true, data: commissions });
  }

  async requestPayout(req: Request, res: Response, _next: NextFunction) {
    const ownerId = req.user?.id as string;
    const data = req.body;
    const payout = await this.settlementService.requestPayout(ownerId, data);
    return res.status(201).json({ success: true, message: 'Yêu cầu rút tiền đã được gửi', data: payout });
  }

  async getMyPayouts(req: Request, res: Response, _next: NextFunction) {
    const ownerId = req.user?.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const payouts = await this.settlementService.getOwnerPayouts(ownerId, page, limit);
    return res.status(200).json({ success: true, data: payouts });
  }

  async updatePayoutStatus(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const { status, transactionId } = req.body;
    const payout = await this.settlementService.updatePayoutStatus(id, status as string as PayoutStatus, transactionId);
    return res.status(200).json({ success: true, message: 'Cập nhật trạng thái rút tiền thành công', data: payout });
  }
}
