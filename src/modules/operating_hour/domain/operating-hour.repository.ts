import { FieldOperatingHour } from '@prisma/client';
import { CreateFieldOperatingHourDto, UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';

export interface IOperatingHourRepository {
  create(fieldYardId: string, data: CreateFieldOperatingHourDto): Promise<FieldOperatingHour>;
  update(id: string, data: UpdateFieldOperatingHourDto): Promise<FieldOperatingHour>;
  delete(id: string): Promise<FieldOperatingHour>;
  findById(id: string): Promise<FieldOperatingHour | null>;
  findByYardId(fieldYardId: string): Promise<FieldOperatingHour[]>;
  findByYardIdAndDay(fieldYardId: string, dayOfWeek: number): Promise<FieldOperatingHour | null>;
  findOverlapping(fieldYardId: string, dayOfWeek: number, excludeId?: string): Promise<FieldOperatingHour | null>;
  checkYardOwnership(yardId: string, ownerId: string): Promise<boolean>;
}
