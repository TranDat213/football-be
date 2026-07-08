import {
  FieldYard,
  FootballField,
  Prisma,
  PrismaClient,
  YardStatus,
  YardType,
} from '@prisma/client';
import { ISubFieldRepository } from '../domain/subfield.repository';
import { YardCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export class PrismaSubFieldRepository implements ISubFieldRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSubfield(id: string): Promise<FieldYard | null> {
    return await this.prisma.fieldYard.findUnique({
      where: {
        id: id,
        deletedAt: null,
      },
    });
  }

  async getSubfields(page: number, limit: number): Promise<FieldYard[]> {
    return await this.prisma.fieldYard.findMany({
      where: {
        deletedAt: null,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findFieldByFieldId(field_id: string): Promise<FootballField | null> {
    return await this.prisma.footballField.findUnique({
      where: {
        id: field_id,
        deletedAt: null,
      },
    });
  }

  async findSubfieldByType(
    type: string,
    field_id: string,
  ): Promise<FieldYard[]> {
    return await this.prisma.fieldYard.findMany({
      where: {
        type: type as YardType,
        footballFieldId: field_id,
        deletedAt: null,
      },
    });
  }

  async findSubfieldsByFieldId(
    page: number,
    limit: number,
    field_id: string,
  ): Promise<FieldYard[]> {
    return await this.prisma.fieldYard.findMany({
      where: {
        footballFieldId: field_id,
        deletedAt: null,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
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

  // ── Transaction-aware methods ──────────────────────────────────────────────

  async findSubfieldByTypeTx(
    tx: Prisma.TransactionClient,
    type: YardType,
    footballFieldId: string,
  ): Promise<FieldYard[]> {
    return await tx.fieldYard.findMany({
      where: {
        type,
        footballFieldId,
        deletedAt: null,
      },
    });
  }

  async createSubfieldTx(
    tx: Prisma.TransactionClient,
    footballFieldId: string,
    data: Pick<YardCompleteDto, 'name' | 'type'>,
    code: string,
  ): Promise<FieldYard> {
    return await tx.fieldYard.create({
      data: {
        name: data.name,
        footballFieldId,
        type: data.type,
        code,
        status: YardStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateYardTx(
    tx: Prisma.TransactionClient,
    yardId: string,
    data: Pick<YardCompleteDto, 'name' | 'type'>,
  ): Promise<FieldYard> {
    return await tx.fieldYard.update({
      where: { id: yardId },
      data: {
        name: data.name,
        type: data.type,
        updatedAt: new Date(),
      },
    });
  }

  async deleteYardTx(
    tx: Prisma.TransactionClient,
    yardId: string,
  ): Promise<void> {
    await tx.fieldYard.update({
      where: { id: yardId },
      data: { deletedAt: new Date() },
    });
  }

  async hasActiveBookingsTx(
    tx: Prisma.TransactionClient,
    yardId: string,
  ): Promise<boolean> {
    const count = await tx.booking.count({
      where: {
        fieldYardId: yardId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    return count > 0;
  }

  async findYardsByFieldIdTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<FieldYard[]> {
    return await tx.fieldYard.findMany({
      where: { footballFieldId: fieldId, deletedAt: null },
    });
  }
}
