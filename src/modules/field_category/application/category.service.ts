import { FieldCategory } from '@prisma/client';
import { ICategoryRepository } from '../domain/category.repository';
import { CategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { normalizeSlug } from '@/utils/slug';
import { Env } from '@/config/env.config';
import {
  BadRequestException,
  InternalServerException,
} from '@/utils/app-error';

export class CategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async create(category: CategoryDto): Promise<FieldCategory> {
    try {
      const slug = normalizeSlug(category.name, Env.MAX_SLUG_LENGTH);
      if (!slug) {
        throw new BadRequestException(
          'Category name is invalid to generate slug',
        );
      }
      return await this.categoryRepository.create(category, slug);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to create category');
    }
  }

  async update(
    categoryId: string,
    category: UpdateCategoryDto,
  ): Promise<FieldCategory> {
    try {
      const slug = normalizeSlug(category.name, Env.MAX_SLUG_LENGTH);
      if (!slug) {
        throw new BadRequestException(
          'Category name is invalid to generate slug',
        );
      }
      const existingCategory =
        await this.categoryRepository.findById(categoryId);
      if (!existingCategory) {
        throw new BadRequestException('Category not found');
      }
      return await this.categoryRepository.update(categoryId, category, slug);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to delete subfield');
    }
  }
  async delete(id: string): Promise<FieldCategory> {
    try {
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new BadRequestException('Category not found');
      }
      if (existingCategory.deletedAt) {
        throw new BadRequestException('Category is deleted');
      }
      return await this.categoryRepository.delete(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to delete subfield');
    }
  }

  async findById(id: string): Promise<FieldCategory | null> {
    return await this.categoryRepository.findById(id);
  }

  async findAll(page:number, limit:number): Promise<FieldCategory[]> {
    return await this.categoryRepository.findAll(page, limit);
  }
}
