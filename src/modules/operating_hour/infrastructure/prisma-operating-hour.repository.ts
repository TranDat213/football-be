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

  async update(id: string, data: UpdateFieldOperatingHourDto): Promise<FieldTimeSlot> {
    const updateData: Prisma.FieldTimeSlotUpdateInput = {};
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.startTime) updateData.startTime = timeStringToDate(data.startTime);
    if (data.endTime) updateData.endTime = timeStringToDate(data.endTime);
    if (data.label !== undefined) updateData.label = data.label;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    return this.prisma.fieldTimeSlot.update({ where: { id }, data: updateData });
  }

  async delete(id: string): Promise<FieldTimeSlot> {
    return this.prisma.fieldTimeSlot.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findById(id: string): Promise<FieldTimeSlot | null> {
    return this.prisma.fieldTimeSlot.findFirst({ where: { id, deletedAt: null } });
  }

  async findByYardId(fieldYardId: string): Promise<FieldTimeSlot[]> {
    return this.prisma.fieldTimeSlot.findMany({
      where: { fieldYardId, deletedAt: null },
      orderBy: [{ dayOfWeek: 'asc' }, { sortOrder: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findByYardIdAndDay(fieldYardId: string, dayOfWeek: number): Promise<FieldTimeSlot | null> {
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
}
