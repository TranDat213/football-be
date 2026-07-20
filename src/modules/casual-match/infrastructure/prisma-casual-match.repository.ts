import {
  CasualMatch,
  CasualMatchParticipant,
  CasualMatchStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  ICasualMatchRepository,
  BrowseFilter,
  OwnerFilter,
  ParticipationFilter,
} from '../domain/casual-match.repository';

export class PrismaCasualMatchRepository implements ICasualMatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Full include shape ──────────────────────────────────────────────────────
  private readonly fullInclude = {
    booking: {
      include: {
        fieldYard: {
          include: { footballField: true },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    },
    host: {
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    },
    participants: {
      where: { deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    },
  } as const;

  async create(
    data: Prisma.CasualMatchCreateInput,
    tx?: any,
  ): Promise<CasualMatch> {
    const client = tx ?? this.prisma;
    return client.casualMatch.create({ data });
  }

  async findById(id: string): Promise<CasualMatch | null> {
    return this.prisma.casualMatch.findUnique({
      where: { id, deletedAt: null },
      include: this.fullInclude,
    });
  }

  async findByBookingId(bookingId: string): Promise<CasualMatch | null> {
    return this.prisma.casualMatch.findUnique({ where: { bookingId } });
  }

  async findOpenMatches(
    filter: BrowseFilter,
  ): Promise<{ data: CasualMatch[]; total: number }> {
    const {
      province,
      district,
      footballFieldId,
      bookingDate,
      skillLevel,
      keyword,
      category,
      yardType,
      startTime,
      maxSlotPrice,
      minSlotsAvailable,
      status,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = filter;

    const where: Prisma.CasualMatchWhereInput = {
      status: status ? (status as any) : CasualMatchStatus.OPEN,
      visibility: 'PUBLIC',
      deletedAt: null,
      OR: [
        { joinDeadline: null },
        { joinDeadline: { gt: new Date() } }
      ],
      booking: {
        deletedAt: null,
        bookingDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, // only today onwards
        fieldYard: {
          footballField: {
            ...(province && { province: { contains: province, mode: 'insensitive' } }),
            ...(district && { district: { contains: district, mode: 'insensitive' } }),
            ...(footballFieldId && { id: footballFieldId }),
            ...(category && {
              OR: [
                { categoryId: category },
                { category: { slug: category } }
              ]
            }),
          },
          ...(yardType && { type: yardType as any }),
        },
        ...(bookingDate && { bookingDate: new Date(bookingDate) }),
        ...(startTime && { startTime: new Date(`1970-01-01T${startTime}:00Z`) }),
      },
      ...(skillLevel && { skillLevel: skillLevel as any }),
      ...(maxSlotPrice !== undefined && { slotPrice: { lte: maxSlotPrice } }),
      ...(minSlotsAvailable !== undefined && { availableSlots: { gte: minSlotsAvailable } }),
    };

    if (keyword) {
      where.AND = [
        {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
            {
              booking: {
                fieldYard: {
                  footballField: {
                    OR: [
                      { name: { contains: keyword, mode: 'insensitive' } },
                      { address: { contains: keyword, mode: 'insensitive' } },
                    ]
                  }
                }
              }
            }
          ]
        }
      ];
    }

    let orderBy: Prisma.CasualMatchOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy === 'price') {
      orderBy = { slotPrice: sortOrder || 'asc' };
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: sortOrder || 'desc' };
    } else if (sortBy === 'date') {
      orderBy = { booking: { bookingDate: sortOrder || 'asc' } };
    }

    const [data, total] = await Promise.all([
      this.prisma.casualMatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          booking: {
            include: {
              fieldYard: { include: { footballField: true } },
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          host: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.casualMatch.count({ where }),
    ]);

    return { data, total };
  }

  async findByHostId(
    hostId: string,
    filter: OwnerFilter,
  ): Promise<{ data: CasualMatch[]; total: number }> {
    const { status, date, page = 1, limit = 10 } = filter;

    const where: Prisma.CasualMatchWhereInput = {
      hostId,
      deletedAt: null,
      ...(status && { status }),
      ...(date && { booking: { bookingDate: new Date(date) } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.casualMatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: { fieldYard: { include: { footballField: true } } },
          },
        },
      }),
      this.prisma.casualMatch.count({ where }),
    ]);

    return { data, total };
  }

  async findByOwnerId(
  ownerId: string,
  filter: OwnerFilter,
): Promise<{ data: CasualMatch[]; total: number }> {
  const { status, date, page = 1, limit = 10 } = filter;

  const where: Prisma.CasualMatchWhereInput = {
    deletedAt: null,

    ...(status && { status }),

    booking: {
      fieldYard: {
        footballField: {
          ownerId,
        },
      },
      ...(date && {
        bookingDate: new Date(date),
      }),
    },
  };

  const [data, total] = await Promise.all([
    this.prisma.casualMatch.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        booking: {
          include: {
            fieldYard: {
              include: {
                footballField: true,
              },
            },
          },
        },
      },
    }),
    this.prisma.casualMatch.count({ where }),
  ]);

  return { data, total };
}

  async update(
    id: string,
    data: Prisma.CasualMatchUpdateInput,
    tx?: any,
  ): Promise<CasualMatch> {
    const client = tx ?? this.prisma;
    return client.casualMatch.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<CasualMatch> {
    return this.prisma.casualMatch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Participant ─────────────────────────────────────────────────────────────

  async findParticipant(
    casualMatchId: string,
    userId: string,
    tx?: any,
  ): Promise<CasualMatchParticipant | null> {
    const client = tx ?? this.prisma;
    return client.casualMatchParticipant.findUnique({
      where: { casualMatchId_userId: { casualMatchId, userId } },
    });
  }

  async findParticipantById(
    id: string,
    tx?: any,
  ): Promise<CasualMatchParticipant | null> {
    const client = tx ?? this.prisma;
    return client.casualMatchParticipant.findUnique({ where: { id } });
  }

  async findParticipantByMatchAndUser(
    casualMatchId: string,
    userId: string,
    tx?: any,
  ): Promise<CasualMatchParticipant | null> {
    return this.findParticipant(casualMatchId, userId, tx);
  }

  async createParticipant(
    data: Prisma.CasualMatchParticipantCreateInput,
    tx?: any,
  ): Promise<CasualMatchParticipant> {
    const client = tx ?? this.prisma;
    return client.casualMatchParticipant.create({ data });
  }

  async updateParticipant(
    id: string,
    data: Prisma.CasualMatchParticipantUpdateInput,
    tx?: any,
  ): Promise<CasualMatchParticipant> {
    const client = tx ?? this.prisma;
    return client.casualMatchParticipant.update({ where: { id }, data });
  }

  async countParticipants(casualMatchId: string): Promise<number> {
    return this.prisma.casualMatchParticipant.count({
      where: {
        casualMatchId,
        deletedAt: null,
        joinStatus: { in: ['PENDING', 'APPROVED'] },
      },
    });
  }

  // ─── Atomic slot update (must run inside transaction) ─────────────────────

  async incrementOccupied(
    id: string,
    count: number,
    tx: any,
  ): Promise<CasualMatch> {
    return tx.casualMatch.update({
      where: { id },
      data: {
        occupiedSlots: { increment: count },
        availableSlots: { decrement: count },
      },
    });
  }

  async decrementOccupied(
    id: string,
    count: number,
    tx: any,
  ): Promise<CasualMatch> {
    return tx.casualMatch.update({
      where: { id },
      data: {
        occupiedSlots: { decrement: count },
        availableSlots: { increment: count },
      },
    });
  }

  async findByParticipantUserId(
    userId: string,
    filter: ParticipationFilter,
  ): Promise<{ data: any[]; total: number }> {
    const { joinStatus, paymentStatus, date, page = 1, limit = 10 } = filter;

    const where: Prisma.CasualMatchParticipantWhereInput = {
      userId,
      deletedAt: null,
      ...(joinStatus && { joinStatus }),
      ...(paymentStatus && { paymentStatus }),
      ...(date && { casualMatch: { booking: { bookingDate: new Date(date) } } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.casualMatchParticipant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          casualMatch: {
            include: {
              booking: {
                include: {
                  fieldYard: { include: { footballField: true } },
                },
              },
              host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      }),
      this.prisma.casualMatchParticipant.count({ where }),
    ]);

    return { data, total };
  }

  async findParticipantsByMatchId(matchId: string): Promise<any[]> {
    return this.prisma.casualMatchParticipant.findMany({
      where: { casualMatchId: matchId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findBookingForCasualCreate(bookingId: string): Promise<any | null> {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { fieldYard: true },
    });
  }

  async findActiveMatchesForSync(): Promise<any[]> {
    return this.prisma.casualMatch.findMany({
      where: {
        status: { in: ['OPEN', 'FULL', 'STARTED'] as any },
        deletedAt: null,
      },
      include: { booking: true },
    });
  }

  async findWithBooking(id: string): Promise<any | null> {
    return this.prisma.casualMatch.findUnique({
      where: { id, deletedAt: null },
      include: { booking: true },
    });
  }

  async cancelParticipationWithTransaction(params: {
    casualMatchId: string;
    userId: string;
    participantId: string;
    isPaid: boolean;
    slotCount: number;
    isFull: boolean;
    hostId: string;
    totalAmount: number;
  }): Promise<any> {
    const { casualMatchId, userId, participantId, isPaid, slotCount, isFull, hostId, totalAmount } = params;

    return this.prisma.$transaction(async (tx) => {
      let finalPayStatus: any = 'UNPAID';

      if (isPaid) {
        finalPayStatus = 'REFUNDED';

        // Notify host
        await tx.notification.create({
          data: {
            recipientId: hostId,
            actorId: userId,
            entityType: 'CasualMatch',
            entityId: casualMatchId,
            type: 'CASUAL_MATCH_JOINED',
            title: 'Người chơi đã hủy slot',
            content: 'Có một người chơi vừa hủy slot tham gia và đã được hoàn tiền.',
          },
        });

        // Notify participant
        await tx.notification.create({
          data: {
            recipientId: userId,
            actorId: userId,
            entityType: 'CasualMatch',
            entityId: casualMatchId,
            type: 'CASUAL_MATCH_LEAVED',
            title: 'Hủy tham gia trận và hoàn tiền',
            content: `Bạn đã hủy tham gia trận vãng lai thành công. Số tiền ${Number(totalAmount).toLocaleString('vi-VN')}đ đã được hoàn lại qua VNPay.`,
          },
        });
      }

      const updatedParticipant = await tx.casualMatchParticipant.update({
        where: { id: participantId },
        data: {
          joinStatus: 'CANCELLED',
          paymentStatus: finalPayStatus,
          cancelledAt: new Date(),
        },
      });

      await tx.casualMatch.update({
        where: { id: casualMatchId },
        data: {
          occupiedSlots: { decrement: slotCount },
          availableSlots: { increment: slotCount },
          status: isFull ? 'OPEN' : undefined,
        },
      });

      return updatedParticipant;
    });
  }
}

