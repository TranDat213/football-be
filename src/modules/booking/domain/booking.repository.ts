import { Booking, FieldPriceRule, FieldYard } from '@prisma/client';

export interface IBookingRepository {
  create(data: any): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  findByUserId(userId: string, filter: any): Promise<Booking[]>;
  findByOwnerId(ownerId: string, filter: any): Promise<Booking[]>;
  checkAvailability(
    yardId: string,
    date: string,
    start: string,
    end: string,
  ): Promise<boolean>;
  findYardById(id: string): Promise<FieldYard | null>;
  findPriceRules(yardId: string, date: string): Promise<FieldPriceRule[]>;
  updateStatus(id: string, status: any, paymentStatus?: any): Promise<Booking>;
  countTotalBookingByOwner(ownerId: string): Promise<number>;
}
