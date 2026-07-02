import { TransactionContext } from './transaction.manager';
import { Payment } from '@prisma/client';

export interface PaymentRepository {
  upsertPayment(
    bookingId: string,
    data: {
      transactionCode: string;
      paymentMethod: string;
      amount: number;
      status: string;
      paidAt: Date;
      gatewayResponse: any;
    },
    tx?: TransactionContext
  ): Promise<Payment>;

  findByBookingId(bookingId: string, tx?: TransactionContext): Promise<any>;

  findAllAdmin(filter: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ data: any[]; meta: any }>;
}
