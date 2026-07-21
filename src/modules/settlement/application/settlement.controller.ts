import { NextFunction, Request, Response } from 'express';
import { SettlementService } from './settlement.service';

export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  async getCommissions(req: Request, res: Response, _next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const commissions = await this.settlementService.getCommissions(page, limit);
    return res.status(200).json({ success: true, data: commissions });
  }
}
