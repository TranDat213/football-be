import { Request, Response, NextFunction } from 'express';
import { FootballFieldUpdateRequestService } from './update-request.service';
import { UpdateFootballFieldCompleteDto } from '@/modules/field/dto/update-field-complete.dto';
import {
  RejectFootballFieldUpdateRequestDto,
  ListFootballFieldUpdateRequestQueryDto,
} from '../dto/update-request.dto';
import { FootballFieldUpdateRequestStatus } from '@prisma/client';

export class FootballFieldUpdateRequestController {
  constructor(private readonly service: FootballFieldUpdateRequestService) {}

  async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const fieldId = req.params.id as string;
      const ownerId = req.user!.id as string;
      const dto = req.body as UpdateFootballFieldCompleteDto;
      const result = await this.service.createRequest(fieldId, ownerId, dto);
      res.status(201).json({ message: 'Update request created', data: result });
    } catch (error) {
      next(error);
    }
  }

  async approveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = req.params.id as string;
      const adminId = req.user!.id as string;
      await this.service.approveRequest(requestId, adminId);
      res.status(200).json({ message: 'Update request approved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async rejectRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = req.params.id as string;
      const adminId = req.user!.id;
      const { reason } = req.body as RejectFootballFieldUpdateRequestDto;
      await this.service.rejectRequest(requestId, adminId, reason);
      res.status(200).json({ message: 'Update request rejected successfully' });
    } catch (error) {
      next(error);
    }
  }

  async listRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const query =
        req.query as unknown as ListFootballFieldUpdateRequestQueryDto;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const results = await this.service.listRequests(query, page, limit);

      res.status(200).json({ data: results });
    } catch (error) {
      next(error);
    }
  }

  async softDelete(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id as string;
    const results = await this.service.softDelete(id);

    res.status(200).json({ data: results });
  }

  async listRequestsByOwnerId(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.params.ownerId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as FootballFieldUpdateRequestStatus;
      const result = await this.service.listRequestsByOwnerId(
        ownerId,
        status,
        page,
        limit,
      );
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
