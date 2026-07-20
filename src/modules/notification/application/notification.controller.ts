import { NextFunction, Request, Response } from 'express';
import { NotificationService } from './notification.service';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  async getNotifications(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.notificationService.getNotifications(userId, page, limit);
    return res.status(200).json({ message: 'Danh sách thông báo', ...result });
  }

  async markAsRead(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const id = req.params['id'] as string;

    const notif = await this.notificationService.markAsRead(id, userId);
    return res.status(200).json({ message: 'Đã đánh dấu đã đọc', data: notif });
  }

  async markAllAsRead(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const result = await this.notificationService.markAllAsRead(userId);
    return res.status(200).json({ message: 'Đã đánh dấu tất cả đã đọc', data: result });
  }

  async getUnreadCount(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user!.id;
    const count = await this.notificationService.getUnreadCount(userId);
    return res.status(200).json({ message: 'Số thông báo chưa đọc', data: count });
  }
}
