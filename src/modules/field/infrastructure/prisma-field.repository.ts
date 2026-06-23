import { IFieldRepository } from '../domain/field.repository';
import {
  FieldCategory,
  FieldImage,
  FieldStatus,
  FootballField,
  PrismaClient,
  User,
} from '@prisma/client';
import { CreateFieldImageDto, FieldDto, UpdateFieldDto, UpdateFieldImageDto } from '../dto/field.dto';

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

  async findByOwnerId(page:number, limit:number, ownerId: string): Promise<FootballField[]> {
    return await this.prisma.footballField.findMany({
      where: { ownerId: ownerId, deletedAt: null },
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

  async createFieldImage(data: CreateFieldImageDto,imageUrl:string,imagePublicId:string): Promise<FieldImage> {
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

  async updateFieldImage(fieldImageId: string, data: UpdateFieldImageDto,imageUrl:string,imagePublicId:string): Promise<FieldImage> {
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

  async findFieldImagesByFieldId(page:number,limit:number,fieldId: string): Promise<FieldImage[]> {
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
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const yards = await this.prisma.fieldYard.findMany({
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
          },
        },
      },
    });

    return yards;
  }
}
