import { PrismaClient, FieldTimeSlot, Prisma } from '@prisma/client';
import { IOperatingHourRepository } from '../domain/operating-hour.repository';
import { UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';
import { FieldTimeSlotCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

function timeStringToDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00Z`);
}

export class PrismaOperatingHourRepository implements IOperatingHourRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async checkYardOwnership(yardId: string, ownerId: string): Promise<boolean> {
    const yard = await this.prisma.fieldYard.findFirst({
      where: {
        id: yardId,
        deletedAt: null,
        footballField: { ownerId, deletedAt: null },
      },
    });
    return !!yard;
  }

  async findById(id: string): Promise<FieldTimeSlot | null> {
    return this.prisma.fieldTimeSlot.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByYardId(fieldYardId: string): Promise<FieldTimeSlot[]> {
    return this.prisma.fieldTimeSlot.findMany({
      where: { fieldYardId, deletedAt: null },
      orderBy: [
        { dayOfWeek: 'asc' },
        { sortOrder: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  async findByYardIdAndDay(
    fieldYardId: string,
    dayOfWeek: number,
  ): Promise<FieldTimeSlot | null> {
    return this.prisma.fieldTimeSlot.findFirst({
      where: { fieldYardId, dayOfWeek, deletedAt: null },
    });
  }

  async findOverlapping(
    fieldYardId: string,
    dayOfWeek: number,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<FieldTimeSlot | null> {
    return this.prisma.fieldTimeSlot.findFirst({
      where: {
        fieldYardId,
        dayOfWeek,
        deletedAt: null,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async createManyOperatingHoursTx(
    tx: Prisma.TransactionClient,
    fieldYardId: string,
    items: FieldTimeSlotCompleteDto[],
  ): Promise<FieldTimeSlot[]> {
    const created: FieldTimeSlot[] = [];
    for (const item of items) {
      created.push(
        await tx.fieldTimeSlot.create({
          data: {
            fieldYardId,
            dayOfWeek: item.dayOfWeek,
            startTime: timeStringToDate(item.startTime),
            endTime: timeStringToDate(item.endTime),
            label: item.label,
            sortOrder: item.sortOrder ?? 0,
          },
        }),
      );
    }
    return created;
  }

  async findTimeSlotsTx(
    tx: Prisma.TransactionClient,
    yardId: string,
  ): Promise<FieldTimeSlot[]> {
    return await tx.fieldTimeSlot.findMany({
      where: { fieldYardId: yardId, deletedAt: null },
    });
  }

  async deleteTimeSlotsTx(
    tx: Prisma.TransactionClient,
    yardId: string,
  ): Promise<void> {
    await tx.fieldTimeSlot.updateMany({
      where: { fieldYardId: yardId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
