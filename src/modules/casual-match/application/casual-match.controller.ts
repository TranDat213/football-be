import { NextFunction, Request, Response } from 'express';
import { CasualMatchService } from './casual-match.service';
import {
  CreateCasualMatchDto,
  UpdateCasualMatchDto,
  JoinCasualMatchDto,
  CancelParticipationDto,
  UpdateMatchStatusDto,
} from '../dto/casual-match.dto';

export class CasualMatchController {
  constructor(private readonly service: CasualMatchService) {}

  // POST /casual-matches
  async create(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const data = req.body as CreateCasualMatchDto;
    const match = await this.service.create(userId, data);
    return res.status(201).json({ message: 'Tạo Casual Match thành công', data: match });
  }

  // GET /casual-matches
  async browse(req: Request, res: Response, _next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const result = await this.service.browse({
      province: req.query.province as string | undefined,
      district: req.query.district as string | undefined,
      footballFieldId: req.query.footballFieldId as string | undefined,
      bookingDate: req.query.bookingDate as string | undefined,
      skillLevel: req.query.skillLevel as string | undefined,
      keyword: req.query.keyword as string | undefined,
      category: req.query.category as string | undefined,
      yardType: req.query.yardType as string | undefined,
      startTime: req.query.startTime as string | undefined,
      maxSlotPrice: req.query.maxSlotPrice ? Number(req.query.maxSlotPrice) : undefined,
      minSlotsAvailable: req.query.minSlotsAvailable ? Number(req.query.minSlotsAvailable) : undefined,
      status: req.query.status as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      page,
      limit,
    });
    return res.status(200).json({
      message: 'Danh sách Casual Match',
      ...result,
    });
  }

  // GET /casual-matches/host
  async getByHostId(req: Request, res: Response, _next: NextFunction) {
    const hostId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const status = req.query.status as any;
    const date = req.query.date as string | undefined;

    const result = await this.service.getByHostId(hostId, { status, date, page, limit });
    return res.status(200).json({ message: 'Casual Match của bạn', ...result });
  }

  async getOwnerMatches(req: Request, res: Response, _next: NextFunction){
    const ownerId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const status = req.query.status as any;
    const date = req.query.date as string | undefined;
    const result = await this.service.getByOwnerId(ownerId, { status, date, page, limit });
    return res.status(200).json({ message: 'Casual Match của bạn', ...result });
  }
  
  // GET /casual-matches/:id
  async getById(req: Request, res: Response, _next: NextFunction) {
    const match = await this.service.getById(req.params.id as string) ;
    return res.status(200).json({ message: 'Chi tiết Casual Match', data: match });
  }

  // PATCH /casual-matches/:id
  async update(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const data = req.body as UpdateCasualMatchDto;
    const match = await this.service.update(req.params.id as string, userId, data);
    return res.status(200).json({ message: 'Cập nhật thành công', data: match });
  }

  // DELETE /casual-matches/:id
  async remove(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    await this.service.remove(req.params.id as string, userId);
    return res.status(200).json({ message: 'Đã xoá Casual Match' });
  }

  // POST /casual-matches/:id/join
  async join(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const data = req.body as JoinCasualMatchDto;
    const result = await this.service.join(req.params.id as string, userId, data);
    return res.status(201).json({ message: 'Đăng ký thành công', data: result });
  }

  // POST /casual-matches/:id/payment
  async initPayment(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const ip = req.ip || '127.0.0.1';
    const result = await this.service.initPayment(req.params.id as string, userId, ip);
    return res.status(200).json({ message: 'URL thanh toán', data: result });
  }

  // POST /casual-matches/payment/ipn  (public — VNPay server-to-server)
  async handleIPN(req: Request, res: Response, _next: NextFunction) {
    const result = await this.service.handleIPN(req.query);
    return res.status(200).json(result);
  }

  // POST /casual-matches/:id/cancel
  async cancelParticipation(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const data = req.body as CancelParticipationDto;
    const result = await this.service.cancelParticipation(req.params.id as string, userId, data);
    return res.status(200).json(result);
  }

  // PATCH /casual-matches/:id/status
  async updateStatus(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const data = req.body as UpdateMatchStatusDto;
    const match = await this.service.updateStatus(req.params.id as string, userId, userRole, data);
    return res.status(200).json({ message: 'Cập nhật trạng thái thành công', data: match });
  }
}
