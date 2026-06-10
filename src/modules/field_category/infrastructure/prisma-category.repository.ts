import { FieldCategory, PrismaClient } from '@prisma/client';
import { ICategoryRepository } from '../domain/category.repository';
import { CategoryDto, UpdateCategoryDto } from '../dto/category.dto';

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async create(category: CategoryDto, slug: string): Promise<FieldCategory> {
    return await this.prisma.fieldCategory.create({
      data: {
        name: category.name,
        displayOrder: category.display_order,
        slug: slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  async update(
    categoryId: string,
    category: UpdateCategoryDto,
    slug: string,
  ): Promise<FieldCategory> {
    return await this.prisma.fieldCategory.update({
      where: { id: categoryId },
      data: {
        name: category.name,
        displayOrder: category.display_order,
        slug: slug,
        updatedAt: new Date(),
      },
    });
  }
  async delete(id: string): Promise<FieldCategory> {
    return await this.prisma.fieldCategory.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
  async findById(id: string): Promise<FieldCategory | null> {
    return await this.prisma.fieldCategory.findUnique({
      where: { id: id },
    });
  }
  async findAll(): Promise<FieldCategory[]> {
    return await this.prisma.fieldCategory.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
