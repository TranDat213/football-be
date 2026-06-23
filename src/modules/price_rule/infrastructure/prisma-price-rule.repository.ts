import { PrismaClient, FieldPriceRule } from '@prisma/client';
import { IPriceRuleRepository } from '../domain/price-rule.repository';
import { CreateFieldPriceRuleDto, UpdateFieldPriceRuleDto } from '../dto/price-rule.dto';

function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

export class PrismaPriceRuleRepository implements IPriceRuleRepository {
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

  async create(fieldYardId: string, data: CreateFieldPriceRuleDto): Promise<FieldPriceRule> {
    return this.prisma.fieldPriceRule.create({
      data: {
        fieldYardId,
        dayOfWeek: data.dayOfWeek ?? null,
        specialDate: data.specialDate ? new Date(data.specialDate) : null,
        startTime: timeStringToDate(data.startTime),
        endTime: timeStringToDate(data.endTime),
        price: data.price,
        label: data.label ?? null,
      }
    });
  }

  async update(id: string, data: UpdateFieldPriceRuleDto): Promise<FieldPriceRule> {
    const updateData: any = {};
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.specialDate !== undefined) {
      updateData.specialDate = data.specialDate ? new Date(data.specialDate) : null;
    }
    if (data.startTime) updateData.startTime = timeStringToDate(data.startTime);
    if (data.endTime) updateData.endTime = timeStringToDate(data.endTime);
    if (data.price !== undefined) updateData.price = data.price;
    if (data.label !== undefined) updateData.label = data.label;

    return this.prisma.fieldPriceRule.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string): Promise<FieldPriceRule> {
    return this.prisma.fieldPriceRule.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async findById(id: string): Promise<FieldPriceRule | null> {
    return this.prisma.fieldPriceRule.findFirst({
      where: { id, deletedAt: null }
    });
  }

  async findByYardId(fieldYardId: string): Promise<FieldPriceRule[]> {
    return this.prisma.fieldPriceRule.findMany({
      where: { fieldYardId, deletedAt: null },
      orderBy: [
        { specialDate: 'asc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });
  }

  async findOverlappingRules(
    fieldYardId: string, 
    dayOfWeek: number | null, 
    specialDate: Date | null, 
    startTime: Date, 
    endTime: Date, 
    excludeId?: string
  ): Promise<FieldPriceRule[]> {
    const where: any = {
      fieldYardId,
      deletedAt: null,
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    };

    if (dayOfWeek !== null) {
      where.dayOfWeek = dayOfWeek;
    } else if (specialDate !== null) {
      where.specialDate = specialDate;
    }

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return this.prisma.fieldPriceRule.findMany({ where });
  }
}
