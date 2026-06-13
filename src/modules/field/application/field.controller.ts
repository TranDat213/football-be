import { NextFunction, Request, Response } from 'express';
import { FieldService } from './field.service';
import {
  FieldDto,
  UpdateFieldDto,
  UpdateFieldStatusDto,
} from '../dto/field.dto';

export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  async createField(req: Request, res: Response, _next: NextFunction) {
    const ownerId = req.user?.id as string;
    const data = req.body as FieldDto;
    const field = await this.fieldService.createField(ownerId, data);
    return res
      .status(201)
      .json({ message: 'Field created successfully', data: field });
  }

  async updateField(req: Request, res: Response, _next: NextFunction) {
    const fieldId = req.params.id as string;
    const data = req.body as UpdateFieldDto;
    const field = await this.fieldService.updateField(fieldId, data);
    return res
      .status(200)
      .json({ message: 'Field updated successfully', data: field });
  }

  async deleteField(req: Request, res: Response, _next: NextFunction) {
    const fieldId = req.params.id as string;
    const field = await this.fieldService.deleteField(fieldId);
    return res
      .status(200)
      .json({ message: 'Field deleted successfully', data: field });
  }

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
    const fields = await this.fieldService.findByOwnerId(page, limit, ownerId);
    return res
      .status(200)
      .json({ message: 'Fields found successfully', data: fields });
  }
}
