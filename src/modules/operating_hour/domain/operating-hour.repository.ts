import { FieldTimeSlot, Prisma } from '@prisma/client';
import { UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';
import { FieldTimeSlotCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export interface IOperatingHourRepository {
  findById(id: string): Promise<FieldTimeSlot | null>;
  findByYardId(fieldYardId: string): Promise<FieldTimeSlot[]>;
  findByYardIdAndDay(
    fieldYardId: string,
    dayOfWeek: number,
  ): Promise<FieldTimeSlot | null>;
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

  findTimeSlotsTx(
    tx: Prisma.TransactionClient,
    yardId: string,
  ): Promise<FieldTimeSlot[]>;

  deleteTimeSlotsTx(
    tx: Prisma.TransactionClient,
    yardId: string,
  ): Promise<void>;
}
