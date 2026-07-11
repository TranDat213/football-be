import {
  Booking,
  BookingSource,
  BookingStatus,
  FieldPriceRule,
  FieldYard,
  FootballField,
  PaymentStatus,
  PrismaClient,
} from '@prisma/client';
import {
  CreateBookingLockData,
  IBookingRepository,
} from '../domain/booking.repository';
import { lt } from 'date-fns/locale';
import { BadRequestException } from '@/utils/app-error';

export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // async create(data: any): Promise<Booking> {
  //   return await this.prisma.booking.create({
  //     data: {
  //       userId: data.userId,
  //       fieldYardId: data.fieldYardId,
  //       bookingDate: new Date(data.bookingDate),
  //       startTime: new Date(`1970-01-01T${data.startTime}:00Z`),
  //       endTime: new Date(`1970-01-01T${data.endTime}:00Z`),
  //       totalPrice: data.totalPrice,
  //       status: data.status,
  //       paymentStatus: data.paymentStatus,
  //       note: data.note,
  //     },
  //   });
  // }

  async findById(id: string): Promise<Booking | null> {
    return await this.prisma.booking.findUnique({
      where: { id },
      include: {
        fieldYard: {
          include: {
            footballField: true,
          },
        },
        user: true,
        payment: true,
      },
    });
  }

  async findByUserId(userId: string, filter: any): Promise<Booking[]> {
    const { page = 1, limit = 10, status } = filter;
    return await this.prisma.booking.findMany({
      where: {
        userId,
        status: status || undefined,
        deletedAt: null,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fieldYard: {
          include: {
            footballField: true,
          },
        },
      },
    });
  }

  async findByOwnerId(ownerId: string, filter: any): Promise<Booking[]> {
    const { page = 1, limit = 10, status } = filter;
    return await this.prisma.booking.findMany({
      where: {
        fieldYard: {
          footballField: {
            ownerId: ownerId,
          },
        },
        status: status || undefined,
        deletedAt: null,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fieldYard: {
          include: {
            footballField: true,
          },
        },
        user: true,
      },
    });
  }

  async checkAvailability(
    yardId: string,
    date: string,
    start: string,
    end: string,
  ): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: this.buildConflictWhere(yardId, date, start, end),
    });
    return count === 0;
  }

  async findYardById(id: string): Promise<FieldYard | null> {
    return await this.prisma.fieldYard.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findPriceRules(
    yardId: string,
    date: string,
  ): Promise<FieldPriceRule[]> {
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay();

    return await this.prisma.fieldPriceRule.findMany({
      where: {
        timeSlot: {
          fieldYardId: yardId,
          dayOfWeek,
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: { timeSlot: true },
    });
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    paymentStatus?: PaymentStatus,
  ): Promise<Booking> {
    return await this.prisma.booking.update({
      where: { id },
      data: {
        status,
        paymentStatus: paymentStatus || undefined,
        updatedAt: new Date(),
      },
    });
  }

  async countTotalBookingByOwner(ownerId: string): Promise<number> {
    return await this.prisma.booking.count({
      where: {
        fieldYard: {
          footballField: {
            ownerId: ownerId,
          },
        },
        deletedAt: null,
      },
    });
  }

  async findBookingByDate(
    date: Date,
    page: number,
    limit: number,
  ): Promise<Booking[]> {
    return await this.prisma.booking.findMany({
      where: {
        bookingDate: date,
        deletedAt: null,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fieldYard: {
          include: {
            footballField: true,
          },
        },
        user: true,
      },
    });
  }

  async countBookingByDate(date: Date): Promise<number> {
    return await this.prisma.booking.count({
      where: {
        bookingDate: date,
        deletedAt: null,
      },
    });
  }

  private buildLockKey(fieldYardId: string, bookingDate: string): string {
    return `booking-lock:${fieldYardId}:${bookingDate}`;
  }

  /**
   * Điều kiện 1 slot đang bị khoá (không cho đặt trùng):
   * - CONFIRMED (đã xác nhận, bất kể online/offline)
   * - PENDING (đã đặt, trả sau tại sân — khoá vĩnh viễn cho tới khi bị huỷ)
   * - AWAITING_PAYMENT còn hạn (đang giữ chỗ chờ thanh toán online)
   */

  private buildConflictWhere(
    fieldYardId: string,
    bookingDate: string,
    start: string,
    end: string,
  ) {
    return {
      fieldYardId,
      bookingDate: new Date(bookingDate),
      deletedAt: null,
      startTime: { lt: new Date(`1970-01-01T${end}:00Z`) },
      endTime: { gt: new Date(`1970-01-01T${start}:00Z`) },
      OR: [
        { status: BookingStatus.CONFIRMED },
        { status: BookingStatus.PENDING },
        {
          status: BookingStatus.AWAITING_PAYMENT,
          expiresAt: { gt: new Date() },
        },
      ],
    };
  }

  async createBookingWithLock(data: CreateBookingLockData): Promise<Booking> {
    return await this.prisma.$transaction(async (tx) => {
      const lockKey = this.buildLockKey(data.fieldYardId, data.bookingDate);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const conflictCount = await tx.booking.count({
        where: this.buildConflictWhere(data.fieldYardId, data.bookingDate, data.startTime, data.endTime),
      });

      if (conflictCount > 0) {
        throw new BadRequestException(
          'Khung giờ này đã có người đặt hoặc đang được giữ chỗ, vui lòng chọn khung giờ khác',
        );
      }

      return await tx.booking.create({
        data: {
          userId: data.userId,
          fieldYardId: data.fieldYardId,
          bookingDate: new Date(data.bookingDate),
          startTime: new Date(`1970-01-01T${data.startTime}:00Z`),
          endTime: new Date(`1970-01-01T${data.endTime}:00Z`),
          totalPrice: data.totalPrice,
          status: data.status,
          paymentStatus: data.paymentStatus ?? PaymentStatus.UNPAID,
          source: data.source ?? BookingSource.ONLINE,
          note: data.note,
          expiresAt: data.expiresAt ?? null,
        },
      });
    });
  }

  // Cron chỉ được đụng AWAITING_PAYMENT — PENDING (trả sau) không bao giờ tự động huỷ
  async releaseExpiredLocks(): Promise<number> {
    const result = await this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.AWAITING_PAYMENT,
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason:
          'Hết thời gian giữ chỗ, tự động huỷ do chưa thanh toán',
      },
    });
    return result.count;
  }

  async findYardWithOwnerById(id: string): Promise<FieldYard | null> {
    return await this.prisma.fieldYard.findUnique({
      where: { id, deletedAt: null },
      include: { footballField: true },
    });
  }

  async findFieldByFieldId(id: string): Promise<FootballField | null> {
    return await this.prisma.footballField.findUnique({
      where: {id, deletedAt:  null},
      include: {owner: true},
    })
  }
}
