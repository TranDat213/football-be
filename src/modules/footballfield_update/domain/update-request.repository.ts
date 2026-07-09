import {
  FootballFieldUpdateRequest,
  FootballFieldUpdateRequestStatus,
} from '@prisma/client';

export interface IFootballFieldUpdateRequestRepository {
  create(data: {
    footballFieldId: string;
    ownerId: string;
    payload: any;
    status: FootballFieldUpdateRequestStatus;
  }): Promise<FootballFieldUpdateRequest>;

  findById(id: string): Promise<FootballFieldUpdateRequest | null>;

  findByFieldIdAndStatus(
    fieldId: string,
    status: FootballFieldUpdateRequestStatus,
  ): Promise<FootballFieldUpdateRequest | null>;

  findPending(query: {
    status?: FootballFieldUpdateRequestStatus;
  },page: number, limit:number): Promise<FootballFieldUpdateRequest[]>;

  updateStatus(
    id: string,
    data: {
      status: FootballFieldUpdateRequestStatus;
      reason?: string;
      reviewedBy: string;
      reviewedAt: Date;
    },
  ): Promise<FootballFieldUpdateRequest>;

  softDelete(id: string): Promise<void>;
}
