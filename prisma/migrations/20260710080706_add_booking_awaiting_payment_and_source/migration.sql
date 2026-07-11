-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'ONLINE';

-- CreateIndex
CREATE INDEX "bookings_status_expires_at_idx" ON "bookings"("status", "expires_at");
