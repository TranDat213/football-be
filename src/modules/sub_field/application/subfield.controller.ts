import { NextFunction, Request, Response } from 'express';
import { SubFieldService } from './subfield.service';
import { UpdateFieldYardDto } from '../dto/subfield.dto';

export class SubFieldController {
  constructor(private readonly subFieldService: SubFieldService) {}

  async updateSubfield(req: Request, res: Response, _next: NextFunction) {
    const data = req.body as UpdateFieldYardDto;
    const id = req.params.id as string;
    const result = await this.subFieldService.updateSubfield(id, data);
    res.status(200).json({
      message: 'Update subfield successfully',
      data: result,
    });
  }

  async deleteSubfield(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const result = await this.subFieldService.deleteSubfield(id);
    res.status(200).json({
      message: 'Delete subfield successfully',
      data: result,
    });
  }

  async getSubfield(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const result = await this.subFieldService.getSubfield(id);
    res.status(200).json({
      message: 'Get subfield successfully',
      data: result,
    });
  }
  
  async getSubfields(req: Request, res: Response, _next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.subFieldService.getSubfields(page, limit);
    res.status(200).json({
      message: 'Get subfields successfully',
      data: result,
    });
  }

  async getSubFieldsByFieldId(
    req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    const field_id = req.params.field_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.subFieldService.getSubfieldsByFieldId(
      page,
      limit,
      field_id,
    );
    res.status(200).json({
      message: 'Get subfields by field id successfully',
      data: result,
    });
  }
}
