import { PrismaClient } from '@prisma/client';
import { PrismaBookingRepository } from './prisma-booking.repository';
import cron from 'node-cron';

export function registerBookingLockCleanupJob(prisma: PrismaClient) {
  const bookingRepository = new PrismaBookingRepository(prisma);

  // Job 1: Huỷ AWAITING_PAYMENT hết hạn giữ chỗ (online payment timeout)
  cron.schedule('*/2 * * * *', async () => {
    try {
      const released = await bookingRepository.releaseExpiredLocks();
      if (released > 0) {
        console.log(`[booking-lock-cleanup] Đã huỷ ${released} đơn chờ thanh toán hết hạn`);
      }
    } catch (error) {
      console.error('[booking-lock-cleanup] Lỗi Job 1:', error);
    }
  });

  // Job 2: Mở khoá offline booking (expiresAt qua, khách chưa confirm) + notify owner
  cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await bookingRepository.releaseExpiredOfflineLocks();
      if (result.count > 0) {
        console.log(`[booking-lock-cleanup] Đã mở khoá ${result.count} offline booking`);
        // Gửi notification cho từng chủ sân
        for (const b of result.bookings) {
          if (!b.ownerId) continue;
          prisma.notification.create({
            data: {
              recipientId: b.ownerId,
              actorId: b.ownerId,
              entityType: 'Booking',
              entityId: b.id,
              type: 'OFFLINE_BOOKING_UNLOCK' as any,
              title: 'Slot đã được mở khoá tự động',
              content: `Booking ${b.fieldName} lúc ${b.startTime} ngày ${b.bookingDate} đã được mở khoá do khách chưa xác nhận đến sân. Slot hiện đang trống.`,
              metadata: {
                bookingId: b.id,
                bookingDate: b.bookingDate,
                startTime: b.startTime,
              } as any,
            },
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('[booking-lock-cleanup] Lỗi Job 2 (offline unlock):', error);
    }
  });

  // Job 3: Tự cancel zombie offline booking (startTime+5min đã qua, chưa confirm)
  cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await bookingRepository.cancelZombieOfflineBookings();
      if (result.count > 0) {
        console.log(`[booking-lock-cleanup] Đã tự huỷ ${result.count} offline booking zombie`);
        // Gửi notification cho từng chủ sân
        for (const b of result.bookings) {
          if (!b.ownerId) continue;
          prisma.notification.create({
            data: {
              recipientId: b.ownerId,
              actorId: b.ownerId,
              entityType: 'Booking',
              entityId: b.id,
              type: 'BOOKING_CANCELLED' as any,
              title: 'Booking tự động huỷ — khách không đến',
              content: `Booking ${b.fieldName} lúc ${b.startTime} ngày ${b.bookingDate} đã tự huỷ vì khách không đến sân sau giờ bắt đầu.`,
              metadata: {
                bookingId: b.id,
                bookingDate: b.bookingDate,
                startTime: b.startTime,
              } as any,
            },
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('[booking-lock-cleanup] Lỗi Job 3 (zombie cancel):', error);
    }
  });
}
