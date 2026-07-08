import { NextFunction, Request, Response } from 'express';
import { PriceRuleService } from './price-rule.service';

export class PriceRuleController {
  constructor(private readonly priceRuleService: PriceRuleService) {}

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await this.priceRuleService.getById(id);
      res.status(200).json({
        message: 'Get price rule successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByYardId(req: Request, res: Response, next: NextFunction) {
    try {
      const yardId = req.params.yardId as string;
      const result = await this.priceRuleService.getByYardId(yardId);
      res.status(200).json({
        message: 'Get price rules by yard id successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
