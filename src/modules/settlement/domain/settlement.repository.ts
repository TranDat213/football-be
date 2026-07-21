import { Commission } from '@prisma/client';

export interface ISettlementRepository {
  // Commission
  getCommissions(filter: any): Promise<Commission[]>;
  createCommission(data: any): Promise<Commission>;
}
