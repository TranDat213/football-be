import {
  Booking,
  BookingSource,
  BookingStatus,
  CasualMatch,
  FieldPriceRule,
  FieldYard,
  FootballField,
  Payment,
  PaymentStatus,
} from '@prisma/client';

export type BookingWithDetails = Booking & {
  casualMatch?: CasualMatch | null;
  payment?: Payment | null;
  fieldYard?: (FieldYard & { footballField?: FootballField | null }) | null;
};

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
  findByUserId(userId: string, filter: any): Promise<{ data: Booking[]; total: number }>;
  findByOwnerId(ownerId: string, filter: any): Promise<{ data: Booking[]; total: number }>;
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
  findWithDetails(id: string): Promise<BookingWithDetails | null>;
  findEligibleForCasualMatch(userId: string): Promise<Booking[]>;
  cancelBookingWithTransaction(params: {
    bookingId: string;
    userId: string;
    reason?: string;
    isPaid: boolean;
    refundTransactionNo?: string;
    refundedAt?: Date;
  }): Promise<Booking>;
  ownerCancelBooking(params: {
    bookingId: string;
    ownerId: string;
    ownerName: string;
    reason: string;
    isPaid: boolean;
  }): Promise<Booking>;
  getOwnerRevenueStats(ownerId: string, year?: number): Promise<{
    monthlyRevenue: { month: number; monthLabel: string; revenue: number; bookingCount: number }[];
    fieldRevenue: { fieldId: string; fieldName: string; revenue: number; bookingCount: number }[];
    summary: {
      totalRevenueThisMonth: number;
      totalRevenueYear: number;
      totalBookingsThisMonth: number;
      totalBookingsYear: number;
    };
  }>;
}
