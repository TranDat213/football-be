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
      page = 1,
      limit = 10,
    } = filter;

    const where: Prisma.CasualMatchWhereInput = {
      status: CasualMatchStatus.OPEN,
      visibility: 'PUBLIC',
      deletedAt: null,
      booking: {
        deletedAt: null,
        fieldYard: {
          footballField: {
            ...(province && { province }),
            ...(district && { district }),
            ...(footballFieldId && { id: footballFieldId }),
          },
        },
        ...(bookingDate && { bookingDate: new Date(bookingDate) }),
      },
      ...(skillLevel && { skillLevel: skillLevel as any }),
      ...(keyword && {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.casualMatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { booking: { bookingDate: 'asc' } },
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
}
