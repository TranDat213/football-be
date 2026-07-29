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
          'Tên danh mục không hợp lệ để tạo slug.',
        );
      }
      return await this.categoryRepository.create(category, slug);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Tạo danh mục thất bại.');
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
        throw new BadRequestException('Không tìm thấy danh mục.');
      }
      return await this.categoryRepository.update(categoryId, category, slug);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Cập nhật danh mục thất bại.');
    }
  }
  async delete(id: string): Promise<FieldCategory> {
    try {
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new BadRequestException('Không tìm thấy danh mục.');
      }
      if (existingCategory.deletedAt) {
        throw new BadRequestException('Danh mục đã bị xóa.');
      }
      return await this.categoryRepository.delete(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Xóa danh mục thất bại.');
    }
  }

  async findById(id: string): Promise<FieldCategory | null> {
    return await this.categoryRepository.findById(id);
  }

  async findAll(page:number, limit:number): Promise<FieldCategory[]> {
    return await this.categoryRepository.findAll(page, limit);
  }
}
