import { NextFunction, Request, Response } from 'express';
import { OperatingHourService } from './operating-hour.service';
import { UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';

export class OperatingHourController {
  constructor(private readonly operatingHourService: OperatingHourService) {}

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await this.operatingHourService.getById(id);
      res.status(200).json({
        message: 'Get operating hour successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByYardId(req: Request, res: Response, next: NextFunction) {
    try {
      const yardId = req.params.yardId as string;
      const result = await this.operatingHourService.getByYardId(yardId);
      res.status(200).json({
        message: 'Get operating hours by yard id successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
