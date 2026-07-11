import {
  Booking,
  BookingSource,
  BookingStatus,
  FieldPriceRule,
  FieldYard,
  FootballField,
  PaymentStatus,
} from '@prisma/client';

export interface CreateBookingLockData {
  userId: string;
  fieldYardId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  note?: string;
  status: BookingStatus;
  expiresAt?: Date | null;
  source?: BookingSource;
  paymentStatus?: PaymentStatus;
}
export interface IBookingRepository {
  // create(data: any): Promise<Booking>;
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

  findBookingByDate(
    date: Date,
    page: number,
    limit: number,
  ): Promise<Booking[]>;
  countBookingByDate(date: Date): Promise<number>;

  createBookingWithLock(data: CreateBookingLockData): Promise<Booking>;
  releaseExpiredLocks(): Promise<number>;
  findYardWithOwnerById(id: string): Promise<FieldYard | null>;
  findFieldByFieldId(id:string): Promise<FootballField | null>;
}
