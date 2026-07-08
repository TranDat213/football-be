import { FieldPriceRule, Prisma } from '@prisma/client';
import { UpdateFieldPriceRuleDto } from '../dto/price-rule.dto';
import { PriceRuleCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export interface IPriceRuleRepository {
  update(id: string, data: UpdateFieldPriceRuleDto): Promise<FieldPriceRule>;
  delete(id: string): Promise<FieldPriceRule>;
  findById(id: string): Promise<FieldPriceRule | null>;
  findByYardId(fieldYardId: string): Promise<FieldPriceRule[]>;
  checkTimeSlotOwnership(timeSlotId: string, ownerId: string): Promise<boolean>;

createPriceRuleTx(
    tx: Prisma.TransactionClient,
    timeSlotId: string,
    item: PriceRuleCompleteDto,
  ): Promise<FieldPriceRule>;

}
