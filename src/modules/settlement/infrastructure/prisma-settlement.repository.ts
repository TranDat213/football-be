import { PayoutStatus, PrismaClient } from '@prisma/client';
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

  async getPayouts(ownerId: string, filter: any) {
    const { page = 1, limit = 10 } = filter;
    return await this.prisma.payout.findMany({
      where: { ownerId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  async createPayout(data: any) {
    return await this.prisma.payout.create({ data });
  }

  async updatePayoutStatus(id: string, status: PayoutStatus, transactionId?: string) {
    return await this.prisma.payout.update({
      where: { id },
      data: { status, transactionId, updatedAt: new Date() }
    });
  }
}
