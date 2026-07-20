import { CasualMatch, CasualMatchParticipant, CasualMatchStatus, JoinStatus, ParticipantPayStatus, Prisma } from '@prisma/client';

export interface BrowseFilter {
  province?: string;
  district?: string;
  footballFieldId?: string;
  bookingDate?: string;  // YYYY-MM-DD
  skillLevel?: string;
  keyword?: string;
  category?: string;
  yardType?: string;
  startTime?: string;
  maxSlotPrice?: number;
  minSlotsAvailable?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface OwnerFilter {
  status?: CasualMatchStatus;
  date?: string;
  page?: number;
  limit?: number;
}

export interface ParticipationFilter {
  joinStatus?: JoinStatus;
  paymentStatus?: ParticipantPayStatus;
  date?: string;   // YYYY-MM-DD filter on booking date
  page?: number;
  limit?: number;
}

export interface ICasualMatchRepository {
  create(data: Prisma.CasualMatchCreateInput, tx?: any): Promise<CasualMatch>;
  findById(id: string): Promise<CasualMatch | null>;
  findByBookingId(bookingId: string): Promise<CasualMatch | null>;
  findOpenMatches(filter: BrowseFilter): Promise<{ data: CasualMatch[]; total: number }>;
  findByHostId(hostId: string, filter: OwnerFilter): Promise<{ data: CasualMatch[]; total: number }>;
  findByOwnerId(ownerId: string, filter: OwnerFilter): Promise<{ data: CasualMatch[]; total: number }>;
  update(id: string, data: Prisma.CasualMatchUpdateInput, tx?: any): Promise<CasualMatch>;
  softDelete(id: string): Promise<CasualMatch>;

  // Participant ops
  findParticipant(casualMatchId: string, userId: string, tx?: any): Promise<CasualMatchParticipant | null>;
  createParticipant(data: Prisma.CasualMatchParticipantCreateInput, tx?: any): Promise<CasualMatchParticipant>;
  updateParticipant(id: string, data: Prisma.CasualMatchParticipantUpdateInput, tx?: any): Promise<CasualMatchParticipant>;
  findParticipantById(id: string, tx?: any): Promise<CasualMatchParticipant | null>;
  findParticipantByMatchAndUser(casualMatchId: string, userId: string, tx?: any): Promise<CasualMatchParticipant | null>;
  countParticipants(casualMatchId: string): Promise<number>;

  // Slot update (atomic — used inside transaction)
  incrementOccupied(id: string, count: number, tx: any): Promise<CasualMatch>;
  decrementOccupied(id: string, count: number, tx: any): Promise<CasualMatch>;

  // Participation history
  findByParticipantUserId(userId: string, filter: ParticipationFilter): Promise<{ data: any[]; total: number }>;
  findParticipantsByMatchId(matchId: string): Promise<any[]>;
  findBookingForCasualCreate(bookingId: string): Promise<any | null>;
  findActiveMatchesForSync(): Promise<any[]>;
  findWithBooking(id: string): Promise<any | null>;
  cancelParticipationWithTransaction(params: {
    casualMatchId: string;
    userId: string;
    participantId: string;
    isPaid: boolean;
    slotCount: number;
    isFull: boolean;
    hostId: string;
    totalAmount: number;
  }): Promise<any>;
}

