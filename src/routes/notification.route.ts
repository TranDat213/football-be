import { Router } from 'express';
import { NotificationController } from '../modules/notification/application/notification.controller';
import { NotificationService } from '../modules/notification/application/notification.service';
import { PrismaNotificationRepository } from '../modules/notification/infrastructure/prisma-notification.repository';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate.middleware';
import { asyncHandler } from '../middleware/async-handler.middleware';

const notificationRepository = new PrismaNotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

const notificationRouter = Router();

notificationRouter.get(
  '/unread-count',
  authenticate,
  asyncHandler(notificationController.getUnreadCount.bind(notificationController)),
);

notificationRouter.get(
  '/',
  authenticate,
  asyncHandler(notificationController.getNotifications.bind(notificationController)),
);

notificationRouter.patch(
  '/read-all',
  authenticate,
  asyncHandler(notificationController.markAllAsRead.bind(notificationController)),
);

notificationRouter.patch(
  '/:id/read',
  authenticate,
  asyncHandler(notificationController.markAsRead.bind(notificationController)),
);

export default notificationRouter;
