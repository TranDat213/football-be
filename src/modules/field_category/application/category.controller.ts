import { NextFunction, Request, Response } from 'express';
import { CategoryService } from './category.service';
import { CategoryDto, UpdateCategoryDto } from '../dto/category.dto';

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  async create(req: Request, res: Response, _next: NextFunction) {
    const dto = req.body as CategoryDto;
    const category = await this.categoryService.create(dto);
    return res
      .status(201)
      .json({ message: 'Category created successfully', data: category });
  }
  async update(req: Request, res: Response, _next: NextFunction) {
    const categoryId = req.params.id as string;
    const dto = req.body as UpdateCategoryDto;
    const category = await this.categoryService.update(categoryId, dto);
    return res
      .status(200)
      .json({ message: 'Category updated successfully', data: category });
  }
  async delete(req: Request, res: Response, _next: NextFunction) {
    const categoryId = req.params.id as string;
    const category = await this.categoryService.delete(categoryId);
    return res
      .status(200)
      .json({ message: 'Category deleted successfully', data: category });
  }
  async findById(req: Request, res: Response, _next: NextFunction) {
    const categoryId = req.params.id as string;
    const category = await this.categoryService.findById(categoryId);
    return res.status(200).json({ data: category });
  }
  async findAll(req: Request, res: Response, _next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const categories = await this.categoryService.findAll(page, limit);
    return res.status(200).json({ data: categories });
  }
}
