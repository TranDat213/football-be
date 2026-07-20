import { Notification } from '@prisma/client';

export interface CreateNotificationData {
  recipientId: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  type: string;
  title: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface INotificationRepository {
  create(data: CreateNotificationData): Promise<Notification>;
  findByRecipientId(
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Notification[]; total: number }>;
  markAsRead(id: string, recipientId: string): Promise<Notification | null>;
  markAllAsRead(recipientId: string): Promise<number>;
  countUnread(recipientId: string): Promise<number>;
}
