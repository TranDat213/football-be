import { FieldYard, FootballField } from '@prisma/client';
import { ISubFieldRepository } from '../domain/subfield.repository';
import { CreateFieldYardDto, UpdateFieldYardDto } from '../dto/subfield.dto';
import { PrismaClient } from '@prisma/client/extension';

export class PrismaSubFieldRepository implements ISubFieldRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async createSubfield(
    data: CreateFieldYardDto,
    code: string,
  ): Promise<FieldYard> {
    return await this.prisma.fieldYard.create({
      data: {
        name: data.name,
        footballFieldId: data.field_id,
        type: data.type,
        status: data.status,
        code: code,
      },
    });
  }
  
  async updateSubfield(
    id: string,
    code: string,
    data: UpdateFieldYardDto,
  ): Promise<FieldYard> {
    return await this.prisma.fieldYard.update({
      where: {
        id: id,
      },
      data: {
        name: data.name,
        footballFieldId: data.field_id,
        type: data.type,
        status: data.status,
        code: code,
      },
    });
  }

  async deleteSubfield(id: string): Promise<FieldYard> {
    return await this.prisma.fieldYard.update({
      where: {
        id: id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getSubfield(id: string): Promise<FieldYard> {
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

  async findFieldByFieldId(field_id: string): Promise<FootballField> {
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
        type: type,
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

  async findFieldByOwnerId(ownerId: string): Promise<FootballField> {
    return await this.prisma.footballField.findFirst({
      where: {
        ownerId: ownerId,
        deletedAt: null,
      },
    });
  }
}
