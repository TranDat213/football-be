import { NextFunction, Request, Response } from 'express';
import { OperatingHourService } from './operating-hour.service';
import { CreateFieldOperatingHourDto, UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';

export class OperatingHourController {
  constructor(private readonly operatingHourService: OperatingHourService) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateFieldOperatingHourDto;
      const yardId = req.params.yardId as string;
      const ownerId = req.user?.id as string;
      const role = req.user?.role as any;
      
      const result = await this.operatingHourService.create(yardId, ownerId, role, data);
      res.status(201).json({
        message: 'Create operating hour successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as UpdateFieldOperatingHourDto;
      const id = req.params.id as string;
      const ownerId = req.user?.id as string;
      const role = req.user?.role as any;

      const result = await this.operatingHourService.update(id, ownerId, role, data);
      res.status(200).json({
        message: 'Update operating hour successfully',
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

      const result = await this.operatingHourService.delete(id, ownerId, role);
      res.status(200).json({
        message: 'Delete operating hour successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

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
