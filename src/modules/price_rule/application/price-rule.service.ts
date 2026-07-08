import { FieldPriceRule, UserRole } from '@prisma/client';
import { IPriceRuleRepository } from '../domain/price-rule.repository';
import { UpdateFieldPriceRuleDto } from '../dto/price-rule.dto';
import { BadRequestException, ForbiddenException } from '@/utils/app-error';

export class PriceRuleService {
  constructor(private readonly priceRuleRepository: IPriceRuleRepository) {}

  async update(id: string, ownerId: string, userRole: UserRole, data: UpdateFieldPriceRuleDto): Promise<FieldPriceRule> {
    const existing = await this.priceRuleRepository.findById(id);
    if (!existing) throw new BadRequestException('Price rule not found');

    const timeSlotId = data.timeSlotId ?? existing.timeSlotId;
    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.priceRuleRepository.checkTimeSlotOwnership(timeSlotId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this time slot');
    }

    return this.priceRuleRepository.update(id, data);
  }

  async delete(id: string, ownerId: string, userRole: UserRole): Promise<FieldPriceRule> {
    const existing = await this.priceRuleRepository.findById(id);
    if (!existing) throw new BadRequestException('Price rule not found');

    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.priceRuleRepository.checkTimeSlotOwnership(existing.timeSlotId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this time slot');
    }

    return this.priceRuleRepository.delete(id);
  }

  async getById(id: string): Promise<FieldPriceRule> {
    const existing = await this.priceRuleRepository.findById(id);
    if (!existing) throw new BadRequestException('Price rule not found');
    return existing;
  }

  async getByYardId(yardId: string): Promise<FieldPriceRule[]> {
    return this.priceRuleRepository.findByYardId(yardId);
  }
}
