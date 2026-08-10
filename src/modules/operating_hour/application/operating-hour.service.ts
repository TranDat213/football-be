import { FieldTimeSlot, UserRole } from '@prisma/client';
import { IOperatingHourRepository } from '../domain/operating-hour.repository';
import { UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';
import { BadRequestException, ForbiddenException } from '@/utils/app-error';

function toTimeDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00Z`);
}

export class OperatingHourService {
  constructor(
    private readonly operatingHourRepository: IOperatingHourRepository,
  ) {}

  async getById(id: string): Promise<FieldTimeSlot> {
    const existing = await this.operatingHourRepository.findById(id);
    if (!existing) throw new BadRequestException('Không tìm thấy khung giờ.');
    return existing;
  }

  async getByYardId(yardId: string): Promise<FieldTimeSlot[]> {
    return this.operatingHourRepository.findByYardId(yardId);
  }
}
