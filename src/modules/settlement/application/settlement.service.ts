import { ISettlementRepository } from '../domain/settlement.repository';

export class SettlementService {
  constructor(private readonly settlementRepository: ISettlementRepository) {}

  async getCommissions(page: number, limit: number) {
    return await this.settlementRepository.getCommissions({ page, limit });
  }
}
