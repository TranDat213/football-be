import {
  PrismaClient,
  FootballFieldUpdateRequest,
  FootballFieldUpdateRequestStatus,
  Prisma,
} from '@prisma/client';
import { IFootballFieldUpdateRequestRepository } from '../domain/update-request.repository';

export class PrismaFootballFieldUpdateRequestRepository implements IFootballFieldUpdateRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    footballFieldId: string;
    ownerId: string;
    payload: any;
    status: FootballFieldUpdateRequestStatus;
  }): Promise<FootballFieldUpdateRequest> {
    return this.prisma.footballFieldUpdateRequest.create({ data });
  }

  async findById(id: string): Promise<FootballFieldUpdateRequest | null> {
    return this.prisma.footballFieldUpdateRequest.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByFieldIdAndStatus(
    fieldId: string,
    status: FootballFieldUpdateRequestStatus,
  ): Promise<FootballFieldUpdateRequest | null> {
    return this.prisma.footballFieldUpdateRequest.findFirst({
      where: { footballFieldId: fieldId, status, deletedAt: null },
    });
  }

  async findPending(query: {
    status?: FootballFieldUpdateRequestStatus;
  }, page: number, limit: number): Promise<FootballFieldUpdateRequest[]> {
    const where: Prisma.FootballFieldUpdateRequestWhereInput = {
      deletedAt: null,
    };
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.footballFieldUpdateRequest.findMany({
      where,
      include: {
        footballField: {
          include:{
            owner: {
              select:{
                id:true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                phone: true,
              }
            }
          }
        }, 
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async updateStatus(
    id: string,
    data: {
      status: FootballFieldUpdateRequestStatus;
      reason?: string;
      reviewedBy: string;
      reviewedAt: Date;
    },
  ): Promise<FootballFieldUpdateRequest> {
    return this.prisma.footballFieldUpdateRequest.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.footballFieldUpdateRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
