export interface ReturnResult {
  success: boolean;
  responseCode: string;
  entityId: string;          // participantId for CMATCH, bookingId for booking
  entityType: 'booking' | 'casual_match';
  amount: number;
  message: string;
}

export interface IExternalIPNHandler {
  matches(txnRef: string): boolean;
  handle(query: any): Promise<{ RspCode: string; Message: string }>;
  /** Optional: dispatch handleReturnUrl for this entity type */
  matchesReturn?(txnRef: string): boolean;
  handleReturn?(query: any): Promise<ReturnResult>;
}