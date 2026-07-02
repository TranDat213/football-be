import { PrismaClient, Commission } from '@prisma/client';
import { CommissionRepository } from '../../domain/repositories/commission.repository';
import { TransactionContext } from '../../domain/repositories/transaction.manager';

export class PrismaCommissionRepository implements CommissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: TransactionContext): any {
    return tx || this.prisma;
  }

  async findByBookingId(bookingId: string, tx?: TransactionContext): Promise<Commission | null> {
    const client = this.getClient(tx);
    return client.commission.findUnique({
      where: { bookingId },
    });
  }

  async create(
    data: { bookingId: string; amount: number; percentage: number },
    tx?: TransactionContext
  ): Promise<Commission> {
    const client = this.getClient(tx);
    return client.commission.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        percentage: data.percentage,
      },
    });
  }
}
