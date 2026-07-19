import { NextFunction, Request, Response } from 'express';
import { FieldService } from './field.service';
import { toPaginatedResult } from '@/utils/pagination';
import {
  UpdateFieldDto,
  UpdateFieldImageDto,
  UpdateFieldStatusDto,
} from '../dto/field.dto';
import { CreateFootballFieldUseCase } from './create-football-field.usecase';
import { UpdateFootballFieldUseCase } from './update-football-field.usecase';
import { DeleteFootballFieldUseCase } from './delete-football-field.usecase';
import { BadRequestException } from '@/utils/app-error';
import { CreateFootballFieldCompleteDto } from '../dto/create-field-complete.dto';
import { UpdateFootballFieldCompleteDto } from '../dto/update-field-complete.dto';
import 'multer';

export class FieldController {
  constructor(
    private readonly fieldService: FieldService,
    private readonly createFootballFieldUseCase?: CreateFootballFieldUseCase,
    private readonly updateFootballFieldUseCase?: UpdateFootballFieldUseCase,
    private readonly deleteFootballFieldUseCase?: DeleteFootballFieldUseCase,
  ) {}

  async findById(req: Request, res: Response, _next: NextFunction) {
    const fieldId = req.params.id as string;
    const field = await this.fieldService.findById(fieldId);
    return res
      .status(200)
      .json({ message: 'Field found successfully', data: field });
  }

  async updateFieldStatus(req: Request, res: Response, _next: NextFunction) {
    const fieldId = req.params.id as string;
    const data = req.body as UpdateFieldStatusDto;
    const field = await this.fieldService.updateFieldStatus(
      fieldId,
      data.status,
    );
    return res
      .status(200)
      .json({ message: 'Field status updated successfully', data: field });
  }

  async getFieldByOwnerId(req: Request, res: Response, _next: NextFunction) {
    const ownerId = req.user?.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { keyword, district, status, sortBy, sortOrder } = req.query;

    const result = await this.fieldService.findByOwnerId(ownerId, {
      page,
      limit,
      keyword: keyword as string,
      district: district as string,
      status: status as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return res
      .status(200)
      .json({
        message: 'Fields found successfully',
        ...toPaginatedResult(result.data, result.total, page, limit)
      });
  }

  async findFieldPendingStatus(
    req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { keyword, province, district, sortBy, sortOrder } = req.query;

    const result = await this.fieldService.findFieldPendingStatus({
      page,
      limit,
      keyword: keyword as string,
      province: province as string,
      district: district as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return res
      .status(200)
      .json({
        message: 'Fields found successfully',
        ...toPaginatedResult(result.data, result.total, page, limit)
      });
  }

  async getFieldStatics(req: Request, res: Response, _next: NextFunction) {
    const statics = await this.fieldService.getFieldStatics();
    return res
      .status(200)
      .json({ message: 'Statics fetched successfully', data: statics });
  }

  async upload(req: Request, res: Response, _next: NextFunction) {
    const imageFile = req.file as Express.Multer.File;
    if (!imageFile) {
      throw new BadRequestException('No image file provided');
    }
    const result = await this.fieldService.uploadImage(imageFile);
    return res.status(201).json({
      message: 'Image uploaded successfully',
      data: result,
    });
  }

  async findFieldImageById(req: Request, res: Response, _next: NextFunction) {
    const fieldImageId = req.params.id as string;
    const fieldImage = await this.fieldService.findFieldImageById(fieldImageId);
    return res
      .status(200)
      .json({ message: 'Field image found successfully', data: fieldImage });
  }

  async findFieldImagesByFieldId(
    req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    const fieldId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const fieldImages = await this.fieldService.findFieldImagesByFieldId(
      page,
      limit,
      fieldId,
    );
    return res
      .status(200)
      .json({ message: 'Field images found successfully', data: fieldImages });
  }

  async getAvailability(req: Request, res: Response, _next: NextFunction) {
    const fieldId = req.params.id as string;
    const date =
      (req.query.date as string) || new Date().toISOString().split('T')[0];
    const availability = await this.fieldService.getAvailability(fieldId, date);
    return res.status(200).json({
      message: 'Availability fetched successfully',
      data: availability,
    });
  }

  async findFieldActiveStatus(
    req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const {
      keyword,
      category,
      yardType,
      province,
      district,
      ward,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await this.fieldService.findFieldActiveStatus({
      page,
      limit,
      keyword: keyword as string,
      category: category as string,
      yardType: yardType as string,
      province: province as string,
      district: district as string,
      ward: ward as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return res
      .status(200)
      .json({
        message: 'Fields found successfully',
        ...toPaginatedResult(result.data, result.total, page, limit)
      });
  }

  // ── Aggregate endpoint ─────────────────────────────────────────────

  async createFieldComplete(req: Request, res: Response, _next: NextFunction) {
    if (!this.createFootballFieldUseCase) {
      return res.status(500).json({ message: 'UseCase not configured' });
    }
    const ownerId = req.user?.id as string;
    const dto = req.body as CreateFootballFieldCompleteDto;
    const result = await this.createFootballFieldUseCase.execute(ownerId, dto);
    return res.status(201).json({
      message: 'Football field created successfully with all related data',
      data: result,
    });
  }

  async updateFieldComplete(req: Request, res: Response, _next: NextFunction) {
    if (!this.updateFootballFieldUseCase) {
      return res
        .status(500)
        .json({ message: 'UpdateFootballFieldUseCase not configured' });
    }
    const ownerId = req.user?.id as string;
    const fieldId = req.params.id as string;
    const dto = req.body as UpdateFootballFieldCompleteDto;
    const result = await this.updateFootballFieldUseCase.execute(
      ownerId,
      fieldId,
      dto,
    );
    return res.status(200).json({
      message: 'Football field updated successfully',
      data: result,
    });
  }

  async deleteFieldComplete(req: Request, res: Response, _next: NextFunction) {
    if (!this.deleteFootballFieldUseCase) {
      return res
        .status(500)
        .json({ message: 'DeleteFootballFieldUseCase not configured' });
    }
    const ownerId = req.user?.id as string;
    const fieldId = req.params.id as string;
    const result = await this.deleteFootballFieldUseCase.execute(
      ownerId,
      fieldId,
    );
    return res.status(200).json(result);
  }
}
