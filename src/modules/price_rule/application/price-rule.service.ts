import { FieldPriceRule, UserRole } from '@prisma/client';
import { IPriceRuleRepository } from '../domain/price-rule.repository';
import { CreateFieldPriceRuleDto, UpdateFieldPriceRuleDto } from '../dto/price-rule.dto';
import { BadRequestException, ForbiddenException } from '@/utils/app-error';

export class PriceRuleService {
  constructor(private readonly priceRuleRepository: IPriceRuleRepository) {}

  private async checkOverlap(
    yardId: string, 
    data: { dayOfWeek?: number, specialDate?: string, startTime: string, endTime: string }, 
    excludeId?: string
  ) {
    const sTime = new Date(`1970-01-01T${data.startTime}:00Z`);
    const eTime = new Date(`1970-01-01T${data.endTime}:00Z`);
    const sDate = data.specialDate ? new Date(data.specialDate) : null;
    const dow = data.dayOfWeek !== undefined ? data.dayOfWeek : null;

    if (dow === null && sDate === null) {
        throw new BadRequestException('Either dayOfWeek or specialDate must be provided');
    }
    if (dow !== null && sDate !== null) {
        throw new BadRequestException('Provide only dayOfWeek or specialDate, not both');
    }

    const overlap = await this.priceRuleRepository.findOverlappingRules(yardId, dow, sDate, sTime, eTime, excludeId);
    if (overlap.length > 0) {
      throw new BadRequestException('Price rule time overlaps with existing rule');
    }
  }

  async create(yardId: string, ownerId: string, userRole: UserRole, data: CreateFieldPriceRuleDto): Promise<FieldPriceRule> {
    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.priceRuleRepository.checkYardOwnership(yardId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    await this.checkOverlap(yardId, data);
    return this.priceRuleRepository.create(yardId, data);
  }

  async update(id: string, ownerId: string, userRole: UserRole, data: UpdateFieldPriceRuleDto): Promise<FieldPriceRule> {
    const existing = await this.priceRuleRepository.findById(id);
    if (!existing) throw new BadRequestException('Price rule not found');

    if (userRole !== UserRole.ADMIN) {
      const isOwner = await this.priceRuleRepository.checkYardOwnership(existing.fieldYardId, ownerId);
      if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
    }

    const dow = data.dayOfWeek !== undefined ? data.dayOfWeek : existing.dayOfWeek;
    const sd = data.specialDate !== undefined ? data.specialDate : existing.specialDate?.toISOString(); // handling date check
    const st = data.startTime ?? existing.startTime.toISOString().substring(11, 16);
    const et = data.endTime ?? existing.endTime.toISOString().substring(11, 16);

    const checkData = {
        dayOfWeek: dow === null ? undefined : dow,
        specialDate: sd,
        startTime: st,
        endTime: et
    };

    if (data.startTime || data.endTime || data.dayOfWeek !== undefined || data.specialDate !== undefined) {
        await this.checkOverlap(existing.fieldYardId, checkData, id);
    }

    return this.priceRuleRepository.update(id, data);
  }

  async delete(id: string, ownerId: string, userRole: UserRole): Promise<FieldPriceRule> {
    const existing = await this.priceRuleRepository.findById(id);
    if (!existing) throw new BadRequestException('Price rule not found');

    if (userRole !== UserRole.ADMIN) {
        const isOwner = await this.priceRuleRepository.checkYardOwnership(existing.fieldYardId, ownerId);
        if (!isOwner) throw new ForbiddenException('You are not the owner of this yard');
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
