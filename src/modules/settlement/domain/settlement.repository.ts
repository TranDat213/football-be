import { Commission, Payout, PayoutStatus } from '@prisma/client';

export interface ISettlementRepository {
  // Commission
  getCommissions(filter: any): Promise<Commission[]>;
  createCommission(data: any): Promise<Commission>;
  
  // Payout
  getPayouts(ownerId: string, filter: any): Promise<Payout[]>;
  createPayout(data: any): Promise<Payout>;
  updatePayoutStatus(id: string, status: PayoutStatus, transactionId?: string): Promise<Payout>;
}
