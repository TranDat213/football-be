import { FieldPriceRule, UserRole } from '@prisma/client';
import { IPriceRuleRepository } from '../domain/price-rule.repository';
import { BadRequestException, ForbiddenException } from '@/utils/app-error';

export class PriceRuleService {
  constructor(private readonly priceRuleRepository: IPriceRuleRepository) {}

   async getById(id: string): Promise<FieldPriceRule> {
    const existing = await this.priceRuleRepository.findById(id);
    if (!existing) throw new BadRequestException('Không tìm thấy quy tắc giá.');
    return existing;
  }

  async getByYardId(yardId: string): Promise<FieldPriceRule[]> {
    return this.priceRuleRepository.findByYardId(yardId);
  }
}
