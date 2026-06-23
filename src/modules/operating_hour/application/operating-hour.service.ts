import { FieldOperatingHour, UserRole } from '@prisma/client';
import { IOperatingHourRepository } from '../domain/operating-hour.repository';
import { CreateFieldOperatingHourDto, UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';
import { BadRequestException, ForbiddenException } from '@/utils/app-error';

export class OperatingHourService {
  constructor(private readonly operatingHourRepository: IOperatingHourRepository) {}

  async create(yardId: string, ownerId: string, userRole: UserRole, data: CreateFieldOperatingHourDto): Promise<FieldOperatingHour> {
    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.operatingHourRepository.checkYardOwnership(yardId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    const overlap = await this.operatingHourRepository.findOverlapping(yardId, data.dayOfWeek);
    if (overlap) {
      throw new BadRequestException(`Operating hour for day ${data.dayOfWeek} already exists for this yard`);
    }

    return this.operatingHourRepository.create(yardId, data);
  }

  async update(id: string, ownerId: string, userRole: UserRole, data: UpdateFieldOperatingHourDto): Promise<FieldOperatingHour> {
    const existing = await this.operatingHourRepository.findById(id);
    if (!existing) throw new BadRequestException('Operating hour not found');

    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.operatingHourRepository.checkYardOwnership(existing.fieldYardId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    if (data.dayOfWeek !== undefined) {
      const overlap = await this.operatingHourRepository.findOverlapping(existing.fieldYardId, data.dayOfWeek, id);
      if (overlap) {
        throw new BadRequestException(`Operating hour for day ${data.dayOfWeek} already exists for this yard`);
      }
    }

    return this.operatingHourRepository.update(id, data);
  }

  async delete(id: string, ownerId: string, userRole: UserRole): Promise<FieldOperatingHour> {
    const existing = await this.operatingHourRepository.findById(id);
    if (!existing) throw new BadRequestException('Operating hour not found');

    if (userRole !== UserRole.ADMIN) {
        const isOwner = await this.operatingHourRepository.checkYardOwnership(existing.fieldYardId, ownerId);
        if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    return this.operatingHourRepository.delete(id);
  }

  async getById(id: string): Promise<FieldOperatingHour> {
    const existing = await this.operatingHourRepository.findById(id);
    if (!existing) throw new BadRequestException('Operating hour not found');
    return existing;
  }

  async getByYardId(yardId: string): Promise<FieldOperatingHour[]> {
    return this.operatingHourRepository.findByYardId(yardId);
  }
}
