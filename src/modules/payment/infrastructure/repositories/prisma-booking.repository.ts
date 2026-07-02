import { PrismaClient, Booking } from '@prisma/client';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { TransactionContext } from '../../domain/repositories/transaction.manager';

export class PrismaBookingRepository implements BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: TransactionContext): any {
    return tx || this.prisma;
  }

  async findByIdWithLock(id: string, tx?: TransactionContext): Promise<any> {
    const client = this.getClient(tx);
    return client.booking.findUnique({
      where: { id },
      include: {
        user: true,
        fieldYard: { include: { footballField: true } },
        payment: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    paymentStatus: string,
    tx?: TransactionContext
  ): Promise<Booking> {
    const client = this.getClient(tx);
    return client.booking.update({
      where: { id },
      data: { status: status as any, paymentStatus: paymentStatus as any },
    });
  }
}
