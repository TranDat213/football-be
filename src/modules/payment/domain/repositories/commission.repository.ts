import { TransactionContext } from './transaction.manager';
import { Commission } from '@prisma/client';

export interface CommissionRepository {
  findByBookingId(bookingId: string, tx?: TransactionContext): Promise<Commission | null>;
  create(
    data: { bookingId: string; amount: number; percentage: number },
    tx?: TransactionContext
  ): Promise<Commission>;
}
