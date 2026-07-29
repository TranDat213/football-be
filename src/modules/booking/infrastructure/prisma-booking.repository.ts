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
  BookingWithDetails,
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

  async findByUserId(userId: string, filter: any): Promise<{ data: Booking[]; total: number }> {
    const page = parseInt(filter.page) || 1;
    const limit = parseInt(filter.limit) || 10;

    const where: any = {
      userId,
      deletedAt: null,
      status: filter.status || undefined,
      bookingDate: filter.bookingDate ? new Date(filter.bookingDate) : undefined,
      startTime: filter.startTime ? new Date(`1970-01-01T${filter.startTime}:00Z`) : undefined,
    };

    const fieldYardConditions: any = {};
    if (filter.yardType) {
      fieldYardConditions.type = filter.yardType;
    }

    const fieldConditions: any = {};
    if (filter.footballFieldId) {
      fieldConditions.id = filter.footballFieldId;
    }
    if (filter.category) {
      fieldConditions.OR = [
        { categoryId: filter.category },
        { category: { slug: filter.category } }
      ];
    }

    if (Object.keys(fieldConditions).length > 0) {
      fieldYardConditions.footballField = fieldConditions;
    }

    if (Object.keys(fieldYardConditions).length > 0) {
      where.fieldYard = fieldYardConditions;
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fieldYard: {
            include: {
              footballField: true,
            },
          },
          casualMatch: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total };
  }

  async findByOwnerId(ownerId: string, filter: any): Promise<{ data: Booking[]; total: number }> {
    const page = parseInt(filter.page) || 1;
    const limit = parseInt(filter.limit) || 10;

    const where: any = {
      deletedAt: null,
      status: filter.status || undefined,
      bookingDate: filter.bookingDate ? new Date(filter.bookingDate) : undefined,
      startTime: filter.startTime ? new Date(`1970-01-01T${filter.startTime}:00Z`) : undefined,
    };

    const fieldYardConditions: any = {};
    if (filter.yardType) {
      fieldYardConditions.type = filter.yardType;
    }

    const fieldConditions: any = {
      ownerId: ownerId,
    };
    if (filter.footballFieldId) {
      fieldConditions.id = filter.footballFieldId;
    }
    if (filter.category) {
      fieldConditions.OR = [
        { categoryId: filter.category },
        { category: { slug: filter.category } }
      ];
    }

    fieldYardConditions.footballField = fieldConditions;
    where.fieldYard = fieldYardConditions;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
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
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total };
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
    });
  }

  async findWithDetails(id: string): Promise<BookingWithDetails | null> {
    return await this.prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: {
        payment: true,
        fieldYard: { include: { footballField: true } },
        casualMatch: true,
      },
    });
  }

  async findEligibleForCasualMatch(userId: string): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        casualMatch: null,
        bookingDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      include: {
        fieldYard: {
          include: {
            footballField: true,
          },
        },
      },
      orderBy: {
        bookingDate: 'asc',
      },
    });

    const now = new Date();
    return bookings.filter((b) => {
      const matchStart = new Date(b.bookingDate);
      const time = new Date(b.startTime);
      matchStart.setHours(time.getHours(), time.getMinutes(), 0, 0);
      return matchStart > now;
    });
  }

  async cancelBookingWithTransaction(params: {
    bookingId: string;
    userId: string;
    reason?: string;
    isPaid: boolean;
    refundTransactionNo?: string;
    refundedAt?: Date;
  }): Promise<Booking> {
    const { bookingId, userId, reason, isPaid, refundTransactionNo, refundedAt } = params;

    return await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true, fieldYard: { include: { footballField: true } }, casualMatch: true },
      });

      let finalPaymentStatus: PaymentStatus = booking?.paymentStatus ?? PaymentStatus.UNPAID;
      const cancelledAt = new Date();

      if (isPaid && booking) {
        finalPaymentStatus = PaymentStatus.REFUNDED;

        if (booking.payment) {
          await tx.payment.update({
            where: { id: booking.payment.id },
            data: { status: PaymentStatus.REFUNDED },
          });
        }

        // Create/update Refund
        await tx.refund.upsert({
          where: { bookingId },
          create: {
            bookingId,
            paymentId: booking.payment?.id ?? null,
            amount: booking.totalPrice,
            reason: reason ?? null,
            status: 'SUCCESS' as any,
            processedAt: refundedAt ?? new Date(),
            adminNote: `VNPay Mock Refund: ${refundTransactionNo || 'COMPLETED'}`,
          },
          update: {
            status: 'SUCCESS' as any,
            processedAt: refundedAt ?? new Date(),
            adminNote: `VNPay Mock Refund: ${refundTransactionNo || 'COMPLETED'}`,
          },
        });

        // Notification
        const fieldName = booking.fieldYard?.footballField?.name || 'Sân bóng';
        await tx.notification.create({
          data: {
            recipientId: userId,
            actorId: userId,
            entityType: 'Booking',
            entityId: bookingId,
            type: 'BOOKING_CANCELLED' as any,
            title: 'Đã hủy đơn đặt sân và hoàn tiền',
            content: `Đơn đặt sân ${fieldName} của bạn đã được hủy thành công. Số tiền ${Number(booking.totalPrice).toLocaleString('vi-VN')}đ đã được hoàn lại qua VNPay.`,
          },
        });
      }

      // Update Booking status to CANCELLED
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          paymentStatus: finalPaymentStatus,
          cancelledAt,
          cancelledReason: reason ?? null,
        },
        include: {
          fieldYard: { include: { footballField: true } },
          payment: true,
          refund: true,
        },
      });

      // Cascade cancel CasualMatch if exists
      if (booking?.casualMatch) {
        await tx.casualMatch.update({
          where: { id: booking.casualMatch.id },
          data: { status: 'CANCELLED' as any },
        });
      }

      return updatedBooking;
    });
  }
  async ownerCancelBooking(params: {
    bookingId: string;
    ownerId: string;
    ownerName: string;
    reason: string;
    isPaid: boolean;
  }): Promise<Booking> {
    const { bookingId, ownerId, ownerName, reason, isPaid } = params;
    const cancelledAt = new Date();

    return await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true, user: true, fieldYard: { include: { footballField: true } } },
      });

      if (!booking) throw new Error('Không tìm thấy đơn đặt sân');

      // Mark payment as REFUND_PENDING if paid
      if (isPaid && booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: PaymentStatus.REFUND_PENDING },
        });

        await tx.refund.upsert({
          where: { bookingId },
          create: {
            bookingId,
            paymentId: booking.payment.id,
            amount: booking.totalPrice,
            reason,
            status: 'PENDING' as any,
          },
          update: {
            status: 'PENDING' as any,
            reason,
          },
        });
      }

      // Notify user
      const fieldName = booking.fieldYard?.footballField?.name ?? 'Sân bóng';
      await tx.notification.create({
        data: {
          recipientId: booking.userId,
          actorId: ownerId,
          entityType: 'Booking',
          entityId: bookingId,
          type: 'OWNER_CANCEL_BOOKING' as any,
          title: 'Đơn đặt sân của bạn đã bị chủ sân hủy.',
          content: `Lý do: ${reason}`,
          metadata: {
            bookingId,
            fieldName,
            reason,
            cancelledBy: ownerName,
            cancelledAt: cancelledAt.toISOString(),
          } as any,
        },
      });

      // Update booking
      return await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.OWNER_CANCELLED,
          paymentStatus: isPaid ? PaymentStatus.REFUND_PENDING : undefined,
          ownerCancelReason: reason,
          ownerCancelledAt: cancelledAt,
          ownerCancelledBy: ownerName,
        } as any,
        include: {
          fieldYard: { include: { footballField: true } },
          payment: true,
          refund: true,
          user: true,
        },
      });
    });
  }

  async getOwnerRevenueStats(ownerId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const startDate = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));

    const ownerFields = await this.prisma.footballField.findMany({
      where: { ownerId, deletedAt: null },
      select: { id: true, name: true },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        fieldYard: {
          footballField: {
            ownerId,
            deletedAt: null,
          },
        },
        deletedAt: null,
        status: BookingStatus.CONFIRMED,
        bookingDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        totalPrice: true,
        bookingDate: true,
        fieldYard: {
          select: {
            footballFieldId: true,
          },
        },
      },
    });

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthLabel: `Tháng ${i + 1}`,
      revenue: 0,
      bookingCount: 0,
    }));

    const fieldRevenueMap = new Map<string, { fieldId: string; fieldName: string; revenue: number; bookingCount: number }>();
    ownerFields.forEach((field) => {
      fieldRevenueMap.set(field.id, {
        fieldId: field.id,
        fieldName: field.name,
        revenue: 0,
        bookingCount: 0,
      });
    });

    let totalRevenueYear = 0;
    let totalBookingsYear = 0;
    let totalRevenueThisMonth = 0;
    let totalBookingsThisMonth = 0;

    bookings.forEach((b) => {
      const bDate = new Date(b.bookingDate);
      const monthIndex = bDate.getUTCMonth();
      const price = Number(b.totalPrice) || 0;

      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyRevenue[monthIndex].revenue += price;
        monthlyRevenue[monthIndex].bookingCount += 1;
      }

      totalRevenueYear += price;
      totalBookingsYear += 1;

      if (targetYear === new Date().getFullYear() && monthIndex + 1 === currentMonth) {
        totalRevenueThisMonth += price;
        totalBookingsThisMonth += 1;
      }

      const fieldId = b.fieldYard?.footballFieldId;
      if (fieldId && fieldRevenueMap.has(fieldId)) {
        const item = fieldRevenueMap.get(fieldId)!;
        item.revenue += price;
        item.bookingCount += 1;
      }
    });

    const fieldRevenue = Array.from(fieldRevenueMap.values());

    return {
      monthlyRevenue,
      fieldRevenue,
      summary: {
        totalRevenueThisMonth,
        totalRevenueYear,
        totalBookingsThisMonth,
        totalBookingsYear,
      },
    };
  }
}

