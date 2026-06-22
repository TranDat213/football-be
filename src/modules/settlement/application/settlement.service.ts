import { PayoutStatus } from '@prisma/client';
import { ISettlementRepository } from '../domain/settlement.repository';
import { BadRequestException } from '../../../utils/app-error';

export class SettlementService {
  constructor(private readonly settlementRepository: ISettlementRepository) {}

  async getCommissions(page: number, limit: number) {
    return await this.settlementRepository.getCommissions({ page, limit });
  }

  async requestPayout(ownerId: string, data: { amount: number; bankAccount: string; bankName: string }) {
    // Basic validation: user should have enough balance
    // In a real app, you'd check Commission total - Payout total
    return await this.settlementRepository.createPayout({
      ownerId,
      amount: data.amount,
      bankAccount: data.bankAccount,
      bankName: data.bankName,
      status: PayoutStatus.PENDING
    });
  }

  async getOwnerPayouts(ownerId: string, page: number, limit: number) {
    return await this.settlementRepository.getPayouts(ownerId, { page, limit });
  }

  async updatePayoutStatus(payoutId: string, status: PayoutStatus, transactionId?: string) {
    return await this.settlementRepository.updatePayoutStatus(payoutId, status, transactionId);
  }
}
