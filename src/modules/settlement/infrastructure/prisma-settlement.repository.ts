import { PrismaClient } from '@prisma/client';
import { ISettlementRepository } from '../domain/settlement.repository';

export class PrismaSettlementRepository implements ISettlementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCommissions(filter: any) {
    const { page = 1, limit = 10 } = filter;
    return await this.prisma.commission.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { booking: true }
    });
  }

  async createCommission(data: any) {
    return await this.prisma.commission.create({ data });
  }
}
