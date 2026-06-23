import { PrismaClient, FieldOperatingHour } from '@prisma/client';
import { IOperatingHourRepository } from '../domain/operating-hour.repository';
import { CreateFieldOperatingHourDto, UpdateFieldOperatingHourDto } from '../dto/operating-hour.dto';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

export class PrismaOperatingHourRepository implements IOperatingHourRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async checkYardOwnership(yardId: string, ownerId: string): Promise<boolean> {
    const yard = await this.prisma.fieldYard.findFirst({
      where: {
        id: yardId,
        deletedAt: null,
        footballField: {
          ownerId: ownerId,
          deletedAt: null
        }
      }
    });
    return !!yard;
  }

  async create(fieldYardId: string, data: CreateFieldOperatingHourDto): Promise<FieldOperatingHour> {
    return this.prisma.fieldOperatingHour.create({
      data: {
        fieldYardId,
        dayOfWeek: data.dayOfWeek,
        openTime: timeStringToDate(data.openTime),
        closeTime: timeStringToDate(data.closeTime),
      }
    });
  }

  async update(id: string, data: UpdateFieldOperatingHourDto): Promise<FieldOperatingHour> {
    const updateData: any = {};
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.openTime) updateData.openTime = timeStringToDate(data.openTime);
    if (data.closeTime) updateData.closeTime = timeStringToDate(data.closeTime);

    return this.prisma.fieldOperatingHour.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string): Promise<FieldOperatingHour> {
    return this.prisma.fieldOperatingHour.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async findById(id: string): Promise<FieldOperatingHour | null> {
    return this.prisma.fieldOperatingHour.findFirst({
      where: { id, deletedAt: null }
    });
  }

  async findByYardId(fieldYardId: string): Promise<FieldOperatingHour[]> {
    return this.prisma.fieldOperatingHour.findMany({
      where: { fieldYardId, deletedAt: null },
      orderBy: { dayOfWeek: 'asc' }
    });
  }

  async findByYardIdAndDay(fieldYardId: string, dayOfWeek: number): Promise<FieldOperatingHour | null> {
    return this.prisma.fieldOperatingHour.findFirst({
      where: { fieldYardId, dayOfWeek, deletedAt: null }
    });
  }

  async findOverlapping(fieldYardId: string, dayOfWeek: number, excludeId?: string): Promise<FieldOperatingHour | null> {
    const where: any = {
      fieldYardId,
      dayOfWeek,
      deletedAt: null
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return this.prisma.fieldOperatingHour.findFirst({ where });
  }
}
