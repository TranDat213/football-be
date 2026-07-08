import { FieldTimeSlot, Prisma } from '@prisma/client';
import { UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';
import { FieldTimeSlotCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export interface IOperatingHourRepository {
  update(id: string, data: UpdateFieldOperatingHourDto): Promise<FieldTimeSlot>;
  delete(id: string): Promise<FieldTimeSlot>;
  findById(id: string): Promise<FieldTimeSlot | null>;
  findByYardId(fieldYardId: string): Promise<FieldTimeSlot[]>;
  findByYardIdAndDay(fieldYardId: string, dayOfWeek: number): Promise<FieldTimeSlot | null>;
  findOverlapping(
    fieldYardId: string,
    dayOfWeek: number,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<FieldTimeSlot | null>;
  checkYardOwnership(yardId: string, ownerId: string): Promise<boolean>;

  createManyOperatingHoursTx(
    tx: Prisma.TransactionClient,
    fieldYardId: string,
    items: FieldTimeSlotCompleteDto[],
  ): Promise<FieldTimeSlot[]>;
}
