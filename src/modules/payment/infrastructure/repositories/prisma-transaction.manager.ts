import { PrismaClient } from '@prisma/client';
import { TransactionContext, TransactionManager } from '../../domain/repositories/transaction.manager';

export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return work(tx);
    });
  }
}
