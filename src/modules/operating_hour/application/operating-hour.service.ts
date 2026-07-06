import { FieldTimeSlot, UserRole } from '@prisma/client';
import { IOperatingHourRepository } from '../domain/operating-hour.repository';
import { CreateFieldOperatingHourDto, UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';
import { BadRequestException, ForbiddenException } from '@/utils/app-error';

function toTimeDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00Z`);
}

export class OperatingHourService {
  constructor(private readonly operatingHourRepository: IOperatingHourRepository) {}

  async create(
    yardId: string,
    ownerId: string,
    userRole: UserRole,
    data: CreateFieldOperatingHourDto,
  ): Promise<FieldTimeSlot> {
    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.operatingHourRepository.checkYardOwnership(yardId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    const overlap = await this.operatingHourRepository.findOverlapping(
      yardId,
      data.dayOfWeek,
      toTimeDate(data.startTime),
      toTimeDate(data.endTime),
    );
    if (overlap) throw new BadRequestException('Time slot overlaps with existing slot');

    return this.operatingHourRepository.create(yardId, data);
  }

  async update(
    id: string,
    ownerId: string,
    userRole: UserRole,
    data: UpdateFieldOperatingHourDto,
  ): Promise<FieldTimeSlot> {
    const existing = await this.operatingHourRepository.findById(id);
    if (!existing) throw new BadRequestException('Time slot not found');

    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.operatingHourRepository.checkYardOwnership(existing.fieldYardId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
    const startTime = data.startTime ? toTimeDate(data.startTime) : existing.startTime;
    const endTime = data.endTime ? toTimeDate(data.endTime) : existing.endTime;
    const overlap = await this.operatingHourRepository.findOverlapping(
      existing.fieldYardId,
      dayOfWeek,
      startTime,
      endTime,
      id,
    );
    if (overlap) throw new BadRequestException('Time slot overlaps with existing slot');

    return this.operatingHourRepository.update(id, data);
  }

  async delete(id: string, ownerId: string, userRole: UserRole): Promise<FieldTimeSlot> {
    const existing = await this.operatingHourRepository.findById(id);
    if (!existing) throw new BadRequestException('Time slot not found');

    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.operatingHourRepository.checkYardOwnership(existing.fieldYardId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    return this.operatingHourRepository.delete(id);
  }

  async getById(id: string): Promise<FieldTimeSlot> {
    const existing = await this.operatingHourRepository.findById(id);
    if (!existing) throw new BadRequestException('Time slot not found');
    return existing;
  }

  async getByYardId(yardId: string): Promise<FieldTimeSlot[]> {
    return this.operatingHourRepository.findByYardId(yardId);
  }
}
