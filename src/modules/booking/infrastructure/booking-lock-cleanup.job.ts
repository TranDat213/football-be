import { PrismaClient } from '@prisma/client';
import { PrismaBookingRepository } from './prisma-booking.repository';
import cron from 'node-cron';

export function registerBookingLockCleanupJob(prisma: PrismaClient) {
  const bookingRepository = new PrismaBookingRepository(prisma);

  // Chạy mỗi 2 phút, huỷ các đơn AWAITING_PAYMENT đã hết hạn giữ chỗ
  cron.schedule('*/2 * * * *', async () => {
    try {
      const released = await bookingRepository.releaseExpiredLocks();
      if (released > 0) {
        console.log(
          `[booking-lock-cleanup] Đã huỷ ${released} đơn đặt sân hết hạn giữ chỗ`,
        );
      }
    } catch (error) {
      console.error(
        '[booking-lock-cleanup] Lỗi khi dọn dẹp lock hết hạn:',
        error,
      );
    }
  });
}
