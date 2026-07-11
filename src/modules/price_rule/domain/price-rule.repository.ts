import { FieldPriceRule, Prisma } from '@prisma/client';
import { PriceRuleCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export interface IPriceRuleRepository {
  findById(id: string): Promise<FieldPriceRule | null>;
  findByYardId(fieldYardId: string): Promise<FieldPriceRule[]>;
  checkTimeSlotOwnership(timeSlotId: string, ownerId: string): Promise<boolean>;

  createPriceRuleTx(
    tx: Prisma.TransactionClient,
    timeSlotId: string,
    item: PriceRuleCompleteDto,
  ): Promise<FieldPriceRule>;

  deletePriceRulesTx(
    tx: Prisma.TransactionClient,
    slotIds: string[],
  ): Promise<void>;
}
