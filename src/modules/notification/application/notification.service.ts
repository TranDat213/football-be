import { PrismaClient } from '@prisma/client';
import { NotFoundException } from '../../../utils/app-error';
import { CreateNotificationData, INotificationRepository } from '../domain/notification.repository';
import { toPaginatedResult } from '@/utils/pagination';

export class NotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async getNotifications(userId: string, page: number, limit: number) {
    const result = await this.notificationRepository.findByRecipientId(userId, page, limit);
    return toPaginatedResult(result.data, result.total, page, limit);
  }

  async markAsRead(id: string, userId: string) {
    const notif = await this.notificationRepository.markAsRead(id, userId);
    if (!notif) throw new NotFoundException('Thông báo không tồn tại');
    return notif;
  }

  async markAllAsRead(userId: string) {
    const count = await this.notificationRepository.markAllAsRead(userId);
    return { updated: count };
  }

  async getUnreadCount(userId: string) {
    return await this.notificationRepository.countUnread(userId);
  }
}

// ─── Helper: dùng trong transaction (tx hoặc prisma) ────────────────────────
export async function createNotification(
  tx: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  data: CreateNotificationData,
) {
  return await (tx as any).notification.create({
    data: {
      recipientId: data.recipientId,
      actorId: data.actorId ?? null,
      entityType: data.entityType,
      entityId: data.entityId,
      type: data.type,
      title: data.title,
      content: data.content ?? null,
      metadata: data.metadata ?? undefined,
    },
  });
}

// ─── Helper: broadcast đến tất cả ADMIN ────────────────────────────────────
export async function notifyAllAdmins(
  prisma: PrismaClient,
  data: Omit<CreateNotificationData, 'recipientId'>,
) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', deletedAt: null },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      recipientId: admin.id,
      actorId: data.actorId ?? null,
      entityType: data.entityType,
      entityId: data.entityId,
      type: data.type as any,
      title: data.title,
      content: data.content ?? null,
      metadata: (data.metadata as any) ?? undefined,
    })),
  });
}
