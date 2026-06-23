import { FieldPriceRule } from '@prisma/client';
import { CreateFieldPriceRuleDto, UpdateFieldPriceRuleDto } from '../dto/price-rule.dto';

export interface IPriceRuleRepository {
  create(fieldYardId: string, data: CreateFieldPriceRuleDto): Promise<FieldPriceRule>;
  update(id: string, data: UpdateFieldPriceRuleDto): Promise<FieldPriceRule>;
  delete(id: string): Promise<FieldPriceRule>;
  findById(id: string): Promise<FieldPriceRule | null>;
  findByYardId(fieldYardId: string): Promise<FieldPriceRule[]>;
  findOverlappingRules(fieldYardId: string, dayOfWeek: number | null, specialDate: Date | null, startTime: Date, endTime: Date, excludeId?: string): Promise<FieldPriceRule[]>;
  checkYardOwnership(yardId: string, ownerId: string): Promise<boolean>;
}
