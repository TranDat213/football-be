import { PrismaClient, Payment } from '@prisma/client';
import { PaymentRepository } from '../../domain/repositories/payment.repository';
import { TransactionContext } from '../../domain/repositories/transaction.manager';

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getClient(tx?: TransactionContext): any {
    return tx || this.prisma;
  }

  async upsertPayment(
    bookingId: string,
    data: { transactionCode: string; paymentMethod: string; amount: number; status: string; paidAt: Date; gatewayResponse: any },
    tx?: TransactionContext
  ): Promise<Payment> {
    const client = this.getClient(tx);
    return client.payment.upsert({
      where: { bookingId },
      create: { 
        bookingId, 
        transactionCode: data.transactionCode,
        paymentMethod: data.paymentMethod as any,
        amount: data.amount,
        status: data.status as any,
        paidAt: data.paidAt,
        gatewayResponse: data.gatewayResponse,
      },
      update: {
        transactionCode: data.transactionCode,
        status: data.status as any,
        paidAt: data.paidAt,
        gatewayResponse: data.gatewayResponse,
      },
    });
  }

  async findByBookingId(bookingId: string, tx?: TransactionContext): Promise<any> {
    const client = this.getClient(tx);
    return client.payment.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            fieldYard: { include: { footballField: { select: { name: true, address: true } } } },
          },
        },
      },
    });
  }

  async findAllAdmin(filter: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ data: any[]; meta: any }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { transactionCode: { contains: filter.search, mode: 'insensitive' } },
        { bookingId: { contains: filter.search, mode: 'insensitive' } },
        { booking: { user: { email: { contains: filter.search, mode: 'insensitive' } } } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
              fieldYard: { include: { footballField: { select: { name: true } } } },
              refund: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data: payments, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
