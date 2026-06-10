import { FieldCategory } from '@prisma/client';
import { ICategoryRepository } from '../domain/category.repository';
import { CategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { normalizeSlug } from '@/utils/slug';
import { Env } from '@/config/env.config';
import { BadRequestException } from '@/utils/app-error';

export class CategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async create(category: CategoryDto): Promise<FieldCategory> {
    const slug = normalizeSlug(category.name, Env.MAX_SLUG_LENGTH);
    if (!slug) {
      throw new BadRequestException(
        'Category name is invalid to generate slug',
      );
    }
    return await this.categoryRepository.create(category, slug);
  }
  async update(
    categoryId: string,
    category: UpdateCategoryDto,
  ): Promise<FieldCategory> {
    const slug = normalizeSlug(category.name, Env.MAX_SLUG_LENGTH);
    if (!slug) {
      throw new BadRequestException(
        'Category name is invalid to generate slug',
      );
    }
    const existingCategory = await this.categoryRepository.findById(categoryId);
    if (!existingCategory) {
      throw new BadRequestException('Category not found');
    }
    return await this.categoryRepository.update(categoryId, category, slug);
  }
  async delete(id: string): Promise<FieldCategory> {
    return await this.categoryRepository.delete(id);
  }
  async findById(id: string): Promise<FieldCategory | null> {
    return await this.categoryRepository.findById(id);
  }
  async findAll(): Promise<FieldCategory[]> {
    return await this.categoryRepository.findAll();
  }
}
