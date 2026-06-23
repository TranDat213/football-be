import { NextFunction, Request, Response } from 'express';
import { PriceRuleService } from './price-rule.service';
import { CreateFieldPriceRuleDto, UpdateFieldPriceRuleDto } from '../dto/price-rule.dto';

export class PriceRuleController {
  constructor(private readonly priceRuleService: PriceRuleService) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateFieldPriceRuleDto;
      const yardId = req.params.yardId as string;
      const ownerId = req.user?.id as string;
      const role = req.user?.role as any;
      
      const result = await this.priceRuleService.create(yardId, ownerId, role, data);
      res.status(201).json({
        message: 'Create price rule successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as UpdateFieldPriceRuleDto;
      const id = req.params.id as string;
      const ownerId = req.user?.id as string;
      const role = req.user?.role as any;

      const result = await this.priceRuleService.update(id, ownerId, role, data);
      res.status(200).json({
        message: 'Update price rule successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ownerId = req.user?.id as string;
      const role = req.user?.role as any;

      const result = await this.priceRuleService.delete(id, ownerId, role);
      res.status(200).json({
        message: 'Delete price rule successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

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
