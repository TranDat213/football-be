import { FieldPriceRule, Prisma } from '@prisma/client';
import { CreateFieldPriceRuleDto, UpdateFieldPriceRuleDto } from '../dto/price-rule.dto';
import { PriceRuleCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export interface IPriceRuleRepository {
  create(fieldYardId: string, data: CreateFieldPriceRuleDto): Promise<FieldPriceRule>;
  update(id: string, data: UpdateFieldPriceRuleDto): Promise<FieldPriceRule>;
  delete(id: string): Promise<FieldPriceRule>;
  findById(id: string): Promise<FieldPriceRule | null>;
  findByYardId(fieldYardId: string): Promise<FieldPriceRule[]>;
  findOverlappingRules(fieldYardId: string, dayOfWeek: number | null, specialDate: Date | null, startTime: Date, endTime: Date, excludeId?: string): Promise<FieldPriceRule[]>;
  checkYardOwnership(yardId: string, ownerId: string): Promise<boolean>;

  // ── Transaction-aware methods (used by CreateFootballFieldUseCase) ──────────
  createManyPriceRulesTx(
    tx: Prisma.TransactionClient,
    fieldYardId: string,
    items: PriceRuleCompleteDto[],
  ): Promise<Prisma.BatchPayload>;
}
