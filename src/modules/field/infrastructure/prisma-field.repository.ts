import {
  FieldActiveFilter,
  FieldOwnerFilter,
  FieldPendingFilter,
  IFieldRepository,
} from '../domain/field.repository';
import {
  FieldCategory,
  FieldImage,
  FieldStatus,
  FootballField,
  Prisma,
  PrismaClient,
  User,
} from '@prisma/client';
import {
  FieldDto,
} from '../dto/field.dto';
import { FieldImageCompleteDto } from '../dto/create-field-complete.dto';

export class PrismaFieldRepository implements IFieldRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByOwnerId(
    ownerId: string,
    filter: FieldOwnerFilter,
  ): Promise<{ data: FootballField[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;

    const where: Prisma.FootballFieldWhereInput = {
      ownerId: ownerId,
      deletedAt: null,
      district: filter.district ? { contains: filter.district, mode: 'insensitive' } : undefined,
      status: filter.status ? (filter.status as FieldStatus) : undefined,
    };

    if (filter.keyword) {
      where.OR = [
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { address: { contains: filter.keyword, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.FootballFieldOrderByWithRelationInput = { createdAt: 'desc' };
    if (filter.sortBy === 'name') {
      orderBy = { name: filter.sortOrder || 'asc' };
    } else if (filter.sortBy === 'status') {
      orderBy = { status: filter.sortOrder || 'asc' };
    }

    const [data, total] = await Promise.all([
      this.prisma.footballField.findMany({
        where,
        include: {
          yards: {
            where: {
              deletedAt: null,
            },
            include: {
              timeSlots: {
                where: {
                  deletedAt: null,
                },
                include: {
                  priceRule: {
                    where: { deletedAt: null },
                  },
                },
                orderBy: [
                  { dayOfWeek: 'asc' },
                  { sortOrder: 'asc' },
                  { startTime: 'asc' },
                ],
              },
            },
          },
          images: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.footballField.count({ where }),
    ]);

    return { data, total };
  }

  async findOwner(ownerId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id: ownerId, deletedAt: null },
    });
  }

  async findCategoryById(categoryId: string): Promise<FieldCategory | null> {
    return await this.prisma.fieldCategory.findUnique({
      where: { id: categoryId, deletedAt: null },
    });
  }

  async findById(fieldId: string): Promise<FootballField | null> {
    return await this.prisma.footballField.findUnique({
      where: { id: fieldId },
      include: {
        yards: {
          where: {
            deletedAt: null,
          },
          include: {
            timeSlots: {
              where: {
                deletedAt: null,
              },
              include: {
                priceRule: {
                  where: { deletedAt: null },
                },
              },
              orderBy: [
                { dayOfWeek: 'asc' },
                { sortOrder: 'asc' },
                { startTime: 'asc' },
              ],
            },
          },
        },
        images: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });
  }

  async updateFieldStatus(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField> {
    return await this.prisma.footballField.update({
      where: { id: fieldId, deletedAt: null },
      data: {
        status: status,
        updatedAt: new Date(),
      },
    });
  }

  async updateFieldStatusWithCascade(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField> {
    return await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (status === FieldStatus.INACTIVE) {
          await this.inactivateYardsTx(tx, fieldId);
        }
        return await tx.footballField.update({
          where: { id: fieldId, deletedAt: null },
          data: {
            status: status,
            updatedAt: new Date(),
          },
        });
      },
      { timeout: 10000 },
    );
  }

  async findFieldImageById(fieldImageId: string): Promise<FieldImage | null> {
    return await this.prisma.fieldImage.findUnique({
      where: { id: fieldImageId },
    });
  }

  async findFieldImagesByFieldId(
    page: number,
    limit: number,
    fieldId: string,
  ): Promise<FieldImage[]> {
    return await this.prisma.fieldImage.findMany({
      where: { footballFieldId: fieldId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findFieldByOwnerId(ownerId: string): Promise<FootballField | null> {
    return await this.prisma.footballField.findFirst({
      where: {
        ownerId: ownerId,
        deletedAt: null,
      },
    });
  }

  async getAvailability(fieldId: string, date: Date): Promise<any> {
  const now = new Date();

  return await this.prisma.fieldYard.findMany({
    where: {
      footballFieldId: fieldId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      bookings: {
        where: {
          bookingDate: date,
          deletedAt: null,
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING' },
            { status: 'AWAITING_PAYMENT', expiresAt: { gt: now } },
          ],
        },
        select: {
          startTime: true,
          endTime: true,
        },
      },
      timeSlots: {
        where: { deletedAt: null },
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          label: true,
          priceRule: {
            where: { deletedAt: null },
            select: {
              price: true,
            },
          },
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { sortOrder: 'asc' },
          { startTime: 'asc' },
        ],
      },
    },
  });
}

  async findFieldActiveStatus(
    filter: FieldActiveFilter,
  ): Promise<{ data: FootballField[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;

    const where: Prisma.FootballFieldWhereInput = {
      status: FieldStatus.ACTIVE,
      deletedAt: null,
      province: filter.province ? { contains: filter.province, mode: 'insensitive' } : undefined,
      district: filter.district ? { contains: filter.district, mode: 'insensitive' } : undefined,
      ward: filter.ward ? { contains: filter.ward, mode: 'insensitive' } : undefined,
      categoryId: filter.category ? filter.category : undefined,
    };

    if (filter.keyword) {
      where.OR = [
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { address: { contains: filter.keyword, mode: 'insensitive' } },
        {
          yards: {
            some: {
              name: { contains: filter.keyword, mode: 'insensitive' },
              deletedAt: null,
            },
          },
        },
      ];
    }

    const yardConditions: Prisma.FieldYardWhereInput[] = [{ deletedAt: null }];
    if (filter.yardType) {
      yardConditions.push({ type: filter.yardType as any });
    }
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      yardConditions.push({
        timeSlots: {
          some: {
            deletedAt: null,
            priceRule: {
              price: {
                gte: filter.minPrice,
                lte: filter.maxPrice,
              },
            },
          },
        },
      });
    }

    if (yardConditions.length > 1) {
      where.yards = {
        some: {
          AND: yardConditions,
        },
      };
    } else {
      where.yards = {
        some: {
          deletedAt: null,
        },
      };
    }

    const isSortByPrice = filter.sortBy === 'price';

    let orderBy: Prisma.FootballFieldOrderByWithRelationInput = { createdAt: 'desc' };
    if (filter.sortBy === 'name') {
      orderBy = { name: filter.sortOrder || 'asc' };
    } else if (filter.sortBy === 'newest') {
      orderBy = { createdAt: filter.sortOrder || 'desc' };
    }

    if (isSortByPrice) {
      const allFields = await this.prisma.footballField.findMany({
        where,
        include: {
          images: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
          },
          yards: {
            where: { deletedAt: null },
            include: {
              timeSlots: {
                where: { deletedAt: null },
                include: { priceRule: { where: { deletedAt: null } } },
              },
            },
          },
        },
      });

      const fieldsWithPrice = allFields.map((field) => {
        let minPrice = Infinity;
        for (const yard of field.yards) {
          for (const slot of yard.timeSlots) {
            if (slot.priceRule) {
              const val = Number(slot.priceRule.price);
              if (val < minPrice) minPrice = val;
            }
          }
        }
        return { field, minPrice: minPrice === Infinity ? null : minPrice };
      });

      fieldsWithPrice.sort((a, b) => {
        const pA = a.minPrice ?? 99999999;
        const pB = b.minPrice ?? 99999999;
        return filter.sortOrder === 'desc' ? pB - pA : pA - pB;
      });

      const total = fieldsWithPrice.length;
      const paginated = fieldsWithPrice
        .slice((page - 1) * limit, page * limit)
        .map((x) => x.field);

      return { data: paginated, total };
    } else {
      const [data, total] = await Promise.all([
        this.prisma.footballField.findMany({
          where,
          include: {
            images: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
            yards: {
              where: { deletedAt: null },
              include: {
                timeSlots: {
                  where: { deletedAt: null },
                  include: { priceRule: { where: { deletedAt: null } } },
                },
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        this.prisma.footballField.count({ where }),
      ]);

      return { data, total };
    }
  }

  async findFieldPendingStatus(
    filter: FieldPendingFilter,
  ): Promise<{ data: FootballField[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;

    const where: Prisma.FootballFieldWhereInput = {
      status: FieldStatus.PENDING,
      deletedAt: null,
      province: filter.province ? { contains: filter.province, mode: 'insensitive' } : undefined,
      district: filter.district ? { contains: filter.district, mode: 'insensitive' } : undefined,
    };

    if (filter.keyword) {
      where.OR = [
        { name: { contains: filter.keyword, mode: 'insensitive' } },
        { address: { contains: filter.keyword, mode: 'insensitive' } },
        {
          owner: {
            OR: [
              { firstName: { contains: filter.keyword, mode: 'insensitive' } },
              { lastName: { contains: filter.keyword, mode: 'insensitive' } },
              { email: { contains: filter.keyword, mode: 'insensitive' } },
              { phone: { contains: filter.keyword, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    let orderBy: Prisma.FootballFieldOrderByWithRelationInput = { createdAt: 'desc' };
    if (filter.sortBy === 'name') {
      orderBy = { name: filter.sortOrder || 'asc' };
    } else if (filter.sortBy === 'createdAt') {
      orderBy = { createdAt: filter.sortOrder || 'desc' };
    } else if (filter.sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const [data, total] = await Promise.all([
      this.prisma.footballField.findMany({
        where,
        include: {
          images: {
            where: { deletedAt: null },
          },
          yards: {
            where: { deletedAt: null },
            include: {
              timeSlots: {
                where: { deletedAt: null },
                include: { priceRule: { where: { deletedAt: null } } },
              },
            },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.footballField.count({ where }),
    ]);

    return { data, total };
  }

  async getFieldStatics(): Promise<any> {
    return await this.prisma.footballField.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    });
  }

  async findBySlug(slug: string): Promise<FootballField | null> {
    return await this.prisma.footballField.findUnique({
      where: { slug: slug, deletedAt: null },
    });
  }

  // ── Transaction-aware methods ──────────────────────────────────────────────

  async createFieldTx(
    tx: Prisma.TransactionClient,
    ownerId: string,
    data: Pick<
      FieldDto,
      | 'name'
      | 'description'
      | 'address'
      | 'province'
      | 'district'
      | 'ward'
      | 'latitude'
      | 'longitude'
    > & {
      categoryId: string;
      openTime?: string;
      closeTime?: string;
    },
    slug: string,
  ): Promise<FootballField> {
    return await tx.footballField.create({
      data: {
        ownerId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        address: data.address,
        province: data.province,
        district: data.district,
        ward: data.ward,
        latitude: data.latitude,
        longitude: data.longitude,
        openTime: data.openTime
          ? new Date(`1970-01-01T${data.openTime}:00Z`)
          : null,
        closeTime: data.closeTime
          ? new Date(`1970-01-01T${data.closeTime}:00Z`)
          : null,
        status: FieldStatus.PENDING,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async createFieldImagesTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
    images: FieldImageCompleteDto[],
  ): Promise<Prisma.BatchPayload> {
    if (images.length === 0) return { count: 0 };
    return await tx.fieldImage.createMany({
      data: images.map((img) => ({
        footballFieldId: fieldId,
        url: img.url,
        publicId: img.publicId,
        isCover: img.isCover,
        sortOrder: img.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
  }

  // ── Update-field Tx methods ────────────────────────────────────────────────

  async updateFieldTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
    data: Partial<{
      name: string;
      description: string | null;
      categoryId: string;
      address: string;
      province: string;
      district: string;
      ward: string | null;
      latitude: number | null;
      longitude: number | null;
      openTime: string;
      closeTime: string;
      slug: string;
    }>,
  ): Promise<FootballField> {
    return await tx.footballField.update({
      where: { id: fieldId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.province !== undefined && { province: data.province }),
        ...(data.district !== undefined && { district: data.district }),
        ...(data.ward !== undefined && { ward: data.ward }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.openTime !== undefined && {
          openTime: new Date(`1970-01-01T${data.openTime}:00Z`),
        }),
        ...(data.closeTime !== undefined && {
          closeTime: new Date(`1970-01-01T${data.closeTime}:00Z`),
        }),
        ...(data.slug !== undefined && { slug: data.slug }),
        updatedAt: new Date(),
      },
    });
  }

  async findFieldImagesTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<FieldImage[]> {
    return await tx.fieldImage.findMany({
      where: { footballFieldId: fieldId, deletedAt: null },
    });
  }

  async deleteImagesTx(
    tx: Prisma.TransactionClient,
    imageIds: string[],
  ): Promise<void> {
    if (imageIds.length === 0) return;
    await tx.fieldImage.updateMany({
      where: { id: { in: imageIds } },
      data: { deletedAt: new Date() },
    });
  }

  async hasActiveBookingsForFieldTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<boolean> {
    const count = await tx.booking.count({
      where: {
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        fieldYard: {
          footballFieldId: fieldId,
          deletedAt: null,
        },
      },
    });
    return count > 0;
  }

  async softDeleteFieldTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<FootballField> {
    const now = new Date();

    // cascade soft-delete price rules → time slots → yards
    const yards = await tx.fieldYard.findMany({
      where: { footballFieldId: fieldId, deletedAt: null },
      select: { id: true },
    });
    const yardIds = yards.map((y) => y.id);

    if (yardIds.length > 0) {
      const slots = await tx.fieldTimeSlot.findMany({
        where: { fieldYardId: { in: yardIds }, deletedAt: null },
        select: { id: true },
      });
      const slotIds = slots.map((s) => s.id);

      if (slotIds.length > 0) {
        await tx.fieldPriceRule.updateMany({
          where: { timeSlotId: { in: slotIds }, deletedAt: null },
          data: { deletedAt: now },
        });
        await tx.fieldTimeSlot.updateMany({
          where: { id: { in: slotIds } },
          data: { deletedAt: now },
        });
      }

      await tx.fieldYard.updateMany({
        where: { id: { in: yardIds } },
        data: { deletedAt: now },
      });
    }

    // TODO: Permanent Delete Flow sẽ cleanup Cloudinary sau.
    return await tx.footballField.update({
      where: { id: fieldId },
      data: { deletedAt: now },
    });
  }

  async inactivateYardsTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<void> {
    await tx.fieldYard.updateMany({
      where: { footballFieldId: fieldId, deletedAt: null },
      data: { status: 'INACTIVE', updatedAt: new Date() },
    });
  }
}
