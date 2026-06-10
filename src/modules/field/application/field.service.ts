import { FieldStatus, FootballField, UserRole } from '@prisma/client';
import { IFieldRepository } from '../domain/field.repository';
import { FieldDto, UpdateFieldDto } from '../dto/field.dto';
import { normalizeSlug } from '@/utils/slug';
import { Env } from '@/config/env.config';
import { BadRequestException } from '@/utils/app-error';

export class FieldService {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async createField(ownerId: string, data: FieldDto): Promise<FootballField> {
    const slug = normalizeSlug(data.name, Env.MAX_SLUG_LENGTH);
    if (!slug) {
      throw new BadRequestException('Field name is invalid to generate slug');
    }
    const owner = await this.fieldRepository.findOwner(ownerId);
    if (!owner || owner.role !== UserRole.OWNER) {
      throw new BadRequestException('Owner not found');
    }
    const category = await this.fieldRepository.findCategoryById(
      data.category_id,
    );
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    return await this.fieldRepository.createField(ownerId, data, slug);
  }

  async updateField(
    fieldId: string,
    data: UpdateFieldDto,
  ): Promise<FootballField> {
    let slug: string | undefined = undefined;
    if (data.name) {
      slug = normalizeSlug(data.name, Env.MAX_SLUG_LENGTH);
      if (!slug) {
        throw new BadRequestException('Field name is invalid to generate slug');
      }
    }
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (data.category_id) {
      const category = await this.fieldRepository.findCategoryById(
        data.category_id,
      );
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }
    return await this.fieldRepository.updateField(fieldId, data, slug);
  }

  async deleteField(fieldId: string): Promise<FootballField> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (field?.status === FieldStatus.ACTIVE) {
      throw new BadRequestException('Field is active');
    }
    return await this.fieldRepository.deleteField(fieldId);
  }

  async findById(fieldId: string): Promise<FootballField> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    return field;
  }

  async updateFieldStatus(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (field.deletedAt) {
      throw new BadRequestException('Field is deleted');
    }
    return await this.fieldRepository.updateFieldStatus(fieldId, status);
  }

  async findByOwnerId(ownerId: string): Promise<FootballField[]> {
    const user = await this.fieldRepository.findOwner(ownerId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.role !== UserRole.OWNER) {
      throw new BadRequestException('User is not owner');
    }
    return await this.fieldRepository.findByOwnerId(ownerId);
  }
}
