-- Migration: notification_system_and_owner_cancel_booking
-- Date: 20260720000000
-- Strategy: safe migration with existing data preservation

-- ============================================================
-- STEP 1: BookingStatus - thêm OWNER_CANCELLED
-- (Postgres cho phép ADD VALUE mà không cần recreate enum)
-- ============================================================
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'OWNER_CANCELLED';

-- ============================================================
-- STEP 2: Booking model - thêm owner cancel fields
-- ============================================================
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "owner_cancel_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "owner_cancelled_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "owner_cancelled_by" VARCHAR(255);

-- ============================================================
-- STEP 3: Notification model - thêm metadata field
-- ============================================================
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- ============================================================
-- STEP 4: NotificationType enum - recreate (có existing data)
-- 
-- Strategy:
--   1. Convert column type sang TEXT tạm
--   2. Xoá enum cũ
--   3. Tạo enum mới với 11 giá trị
--   4. Map dữ liệu cũ sang giá trị mới (hoặc xoá nếu không map được)
--   5. Convert column về enum mới
-- ============================================================

-- 4a. Backup: convert sang TEXT
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE TEXT;

-- 4b. Drop enum cũ
DROP TYPE IF EXISTS "NotificationType";

-- 4c. Tạo enum mới
CREATE TYPE "NotificationType" AS ENUM (
  'OWNER_REGISTER_APPROVED',
  'FIELD_APPROVED',
  'FIELD_CREATED_APPROVED',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'CASUAL_MATCH_JOINED',
  'CASUAL_MATCH_LEAVED',
  'FIELD_WAITING_APPROVAL',
  'FIELD_UPDATE_WAITING',
  'OWNER_REGISTER_WAITING',
  'OWNER_CANCEL_BOOKING'
);

-- 4d. Map dữ liệu cũ sang giá trị mới
-- Giữ BOOKING_CANCELLED (trùng tên)
-- Các loại khác không có giá trị tương đương → update sang BOOKING_CANCELLED hoặc xoá
UPDATE "notifications"
SET "type" = 'BOOKING_CANCELLED'
WHERE "type" IN (
  'BOOKING_CONFIRMED',
  'PAYMENT_SUCCESS',
  'MATCH_JOINED',
  'MATCH_APPROVED',
  'REVIEW_REPLY',
  'NEW_MATCH_POST',
  'SYSTEM'
);

-- 4e. Convert column về enum mới
ALTER TABLE "notifications"
  ALTER COLUMN "type" TYPE "NotificationType"
  USING "type"::"NotificationType";
