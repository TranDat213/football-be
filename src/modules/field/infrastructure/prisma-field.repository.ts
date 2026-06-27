import { IFieldRepository } from '../domain/field.repository';
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
  CreateFieldImageDto,
  FieldDto,
  UpdateFieldDto,
  UpdateFieldImageDto,
} from '../dto/field.dto';
import { FieldImageCompleteDto } from '../dto/create-field-complete.dto';

export class PrismaFieldRepository implements IFieldRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createField(
    ownerId: string,
    data: FieldDto,
    slug: string,
  ): Promise<FootballField> {
    return await this.prisma.footballField.create({
      data: {
        ownerId: ownerId,
        categoryId: data.category_id,
        name: data.name,
        description: data.description,
        address: data.address,
        province: data.province,
        district: data.district,
        ward: data.ward,
        latitude: data.latitude,
        longitude: data.longitude,
        openTime: data.open_time
          ? new Date(`1970-01-01T${data.open_time}:00Z`)
          : null,
        closeTime: data.close_time
          ? new Date(`1970-01-01T${data.close_time}:00Z`)
          : null,
        status: FieldStatus.PENDING,
        slug: slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findByOwnerId(
    page: number,
    limit: number,
    ownerId: string,
  ): Promise<FootballField[]> {
    return await this.prisma.footballField.findMany({
      where: { ownerId: ownerId, deletedAt: null },
      include: {
        yards: {
          where: {
            deletedAt: null,
          },
          include: {
            operatingHours: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                dayOfWeek: 'asc',
              },
            },
            priceRules: {
              where: {
                deletedAt: null,
              },
              orderBy: [
                {
                  specialDate: 'asc',
                },
                {
                  dayOfWeek: 'asc',
                },
                {
                  startTime: 'asc',
                },
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
      orderBy: { createdAt: 'desc' },
    });
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

  async updateField(
    fieldId: string,
    data: UpdateFieldDto,
    slug?: string,
  ): Promise<FootballField> {
    return await this.prisma.footballField.update({
      where: { id: fieldId },
      data: {
        categoryId: data.category_id,
        name: data.name,
        description: data.description,
        address: data.address,
        province: data.province,
        district: data.district,
        ward: data.ward,
        latitude: data.latitude,
        longitude: data.longitude,
        openTime: data.open_time
          ? new Date(`1970-01-01T${data.open_time}:00Z`)
          : undefined,
        closeTime: data.close_time
          ? new Date(`1970-01-01T${data.close_time}:00Z`)
          : undefined,
        status: FieldStatus.PENDING,
        slug: slug,
        updatedAt: new Date(),
      },
    });
  }

  async deleteField(fieldId: string): Promise<FootballField> {
    return await this.prisma.footballField.update({
      where: { id: fieldId },
      data: {
        deletedAt: new Date(),
      },
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
            operatingHours: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                dayOfWeek: 'asc',
              },
            },
            priceRules: {
              where: {
                deletedAt: null,
              },
              orderBy: [
                {
                  specialDate: 'asc',
                },
                {
                  dayOfWeek: 'asc',
                },
                {
                  startTime: 'asc',
                },
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

  async createFieldImage(
    data: CreateFieldImageDto,
    imageUrl: string,
    imagePublicId: string,
  ): Promise<FieldImage> {
    return await this.prisma.fieldImage.create({
      data: {
        footballFieldId: data.footballFieldId,
        url: imageUrl,
        publicId: imagePublicId,
        sortOrder: data.sortOrder,
        isCover: data.isCover,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateFieldImage(
    fieldImageId: string,
    data: UpdateFieldImageDto,
    imageUrl: string,
    imagePublicId: string,
  ): Promise<FieldImage> {
    return await this.prisma.fieldImage.update({
      where: { id: fieldImageId },
      data: {
        url: imageUrl,
        publicId: imagePublicId,
        sortOrder: data.sortOrder,
        isCover: data.isCover,
        updatedAt: new Date(),
      },
    });
  }

  async deleteFieldImage(fieldImageId: string): Promise<FieldImage> {
    return await this.prisma.fieldImage.update({
      where: { id: fieldImageId },
      data: {
        deletedAt: new Date(),
      },
    });
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
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
            deletedAt: null,
          },
          select: {
            startTime: true,
            endTime: true,
          },
        },
        priceRules: {
          where: { deletedAt: null },
          select: {
            dayOfWeek: true,
            specialDate: true,
            startTime: true,
            endTime: true,
            price: true,
            label: true,
          },
          orderBy: [{ specialDate: 'asc' }, { startTime: 'asc' }],
        },
        operatingHours: {
          where: { deletedAt: null },
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
    });
  }

  async findFieldActiveStatus(
    page: number,
    limit: number,
  ): Promise<FootballField[]> {
    return await this.prisma.footballField.findMany({
      where: { status: FieldStatus.ACTIVE, deletedAt: null },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        yards: {
          include: {
            priceRules: true,
            operatingHours: true,
          },
        },
      },
    });
  }

  async findFieldPendingStatus(
    page: number,
    limit: number,
  ): Promise<FootballField[]> {
    return await this.prisma.footballField.findMany({
      where: { status: FieldStatus.PENDING, deletedAt: null },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        yards: {
          include: {
            priceRules: true,
            operatingHours: true,
          },
        },
        owner: {
          // thêm dòng này
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
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
        publicId: null,
        isCover: img.isCover,
        sortOrder: img.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
  }
}
