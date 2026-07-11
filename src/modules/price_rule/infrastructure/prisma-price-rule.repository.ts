import { PrismaClient, FieldPriceRule, Prisma } from '@prisma/client';
import { IPriceRuleRepository } from '../domain/price-rule.repository';
import { PriceRuleCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export class PrismaPriceRuleRepository implements IPriceRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async checkTimeSlotOwnership(
    timeSlotId: string,
    ownerId: string,
  ): Promise<boolean> {
    const slot = await this.prisma.fieldTimeSlot.findFirst({
      where: {
        id: timeSlotId,
        deletedAt: null,
        fieldYard: {
          deletedAt: null,
          footballField: { ownerId, deletedAt: null },
        },
      },
    });
    return !!slot;
  }

  async findById(id: string): Promise<FieldPriceRule | null> {
    return this.prisma.fieldPriceRule.findFirst({
      where: { id, deletedAt: null },
      include: { timeSlot: true },
    });
  }

  async findByYardId(fieldYardId: string): Promise<FieldPriceRule[]> {
    return this.prisma.fieldPriceRule.findMany({
      where: { deletedAt: null, timeSlot: { fieldYardId, deletedAt: null } },
      include: { timeSlot: true },
      orderBy: [{ timeSlot: { dayOfWeek: 'asc' } }],
    });
  }

  async createPriceRuleTx(
    tx: Prisma.TransactionClient,
    timeSlotId: string,
    item: PriceRuleCompleteDto,
  ): Promise<FieldPriceRule> {
    return tx.fieldPriceRule.create({
      data: {
        timeSlotId,
        price: item.price,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async deletePriceRulesTx(
    tx: Prisma.TransactionClient,
    slotIds: string[],
  ): Promise<void> {
    if (slotIds.length === 0) return;
    await tx.fieldPriceRule.updateMany({
      where: { timeSlotId: { in: slotIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
