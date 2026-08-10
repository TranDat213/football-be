-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'OFFLINE_BOOKING_UNLOCK';
ALTER TYPE "NotificationType" ADD VALUE 'OFFLINE_ARRIVAL_CONFIRM';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "customer_arrived_at" TIMESTAMP(3);
