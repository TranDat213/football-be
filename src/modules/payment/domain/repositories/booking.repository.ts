import { TransactionContext } from './transaction.manager';
import { Booking } from '@prisma/client';

export interface BookingRepository {
  findByIdWithLock(id: string, tx?: TransactionContext): Promise<any>;
  updateStatus(
    id: string,
    status: string,
    paymentStatus: string,
    tx?: TransactionContext
  ): Promise<Booking>;
}
