import { Notification, PrismaClient } from '@prisma/client';
import { CreateNotificationData, INotificationRepository } from '../domain/notification.repository';

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    return await this.prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        actorId: data.actorId ?? null,
        entityType: data.entityType,
        entityId: data.entityId,
        type: data.type as any,
        title: data.title,
        content: data.content ?? null,
        metadata: (data.metadata as any) ?? undefined,
      },
    });
  }

  async findByRecipientId(
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Notification[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { recipientId, deletedAt: null },
      }),
    ]);
    return { data, total };
  }

  async markAsRead(id: string, recipientId: string): Promise<Notification | null> {
    const notif = await this.prisma.notification.findFirst({
      where: { id, recipientId, deletedAt: null },
    });
    if (!notif) return null;
    return await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId, isRead: false, deletedAt: null },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  async countUnread(recipientId: string): Promise<number> {
    return await this.prisma.notification.count({
      where: { recipientId, isRead: false, deletedAt: null },
    });
  }
}
