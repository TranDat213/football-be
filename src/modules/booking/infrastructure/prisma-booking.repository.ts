import { Booking, BookingStatus, FieldPriceRule, FieldYard, PaymentStatus, PrismaClient } from '@prisma/client';
import { IBookingRepository } from '../domain/booking.repository';

export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: any): Promise<Booking> {
    return await this.prisma.booking.create({
      data: {
        userId: data.userId,
        fieldYardId: data.fieldYardId,
        bookingDate: new Date(data.bookingDate),
        startTime: new Date(`1970-01-01T${data.startTime}:00Z`),
        endTime: new Date(`1970-01-01T${data.endTime}:00Z`),
        totalPrice: data.totalPrice,
        status: data.status,
        paymentStatus: data.paymentStatus,
        note: data.note,
      }
    });
  }

  async findById(id: string): Promise<Booking | null> {
    return await this.prisma.booking.findUnique({
      where: { id },
      include: {
        fieldYard: {
          include: {
            footballField: true
          }
        },
        user: true,
        payment: true
      }
    });
  }

  async findByUserId(userId: string, filter: any): Promise<Booking[]> {
    const { page = 1, limit = 10, status } = filter;
    return await this.prisma.booking.findMany({
      where: {
        userId,
        status: status || undefined,
        deletedAt: null
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fieldYard: {
          include: {
            footballField: true
          }
        }
      }
    });
  }

  async findByOwnerId(ownerId: string, filter: any): Promise<Booking[]> {
    const { page = 1, limit = 10, status } = filter;
    return await this.prisma.booking.findMany({
      where: {
        fieldYard: {
          footballField: {
            ownerId: ownerId
          }
        },
        status: status || undefined,
        deletedAt: null
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fieldYard: {
          include: {
            footballField: true
          }
        },
        user: true
      }
    });
  }

  async checkAvailability(yardId: string, date: string, start: string, end: string): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: {
        fieldYardId: yardId,
        bookingDate: new Date(date),
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
        },
        OR: [
          {
            startTime: {
              lt: new Date(`1970-01-01T${end}:00Z`)
            },
            endTime: {
              gt: new Date(`1970-01-01T${start}:00Z`)
            }
          }
        ],
        deletedAt: null
      }
    });
    return count === 0;
  }

  async findYardById(id: string): Promise<FieldYard | null> {
    return await this.prisma.fieldYard.findUnique({
      where: { id, deletedAt: null }
    });
  }

  async findPriceRules(yardId: string, date: string): Promise<FieldPriceRule[]> {
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay();

    return await this.prisma.fieldPriceRule.findMany({
      where: {
        fieldYardId: yardId,
        OR: [
          { specialDate: bookingDate },
          { dayOfWeek: dayOfWeek, specialDate: null }
        ],
        deletedAt: null
      }
    });
  }

  async updateStatus(id: string, status: BookingStatus, paymentStatus?: PaymentStatus): Promise<Booking> {
    return await this.prisma.booking.update({
      where: { id },
      data: {
        status,
        paymentStatus: paymentStatus || undefined,
        updatedAt: new Date()
      }
    });
  }
}
