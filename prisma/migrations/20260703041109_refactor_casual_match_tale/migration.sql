/*
  Warnings:

  - You are about to drop the `match_post_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `match_posts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CasualMatchStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'STARTED', 'FINISHED');

-- CreateEnum
CREATE TYPE "ParticipantPayStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'REFUND_PENDING');

-- AlterEnum
ALTER TYPE "JoinStatus" ADD VALUE 'WAITLISTED';

-- DropForeignKey
ALTER TABLE "match_post_participants" DROP CONSTRAINT "match_post_participants_match_post_id_fkey";

-- DropForeignKey
ALTER TABLE "match_post_participants" DROP CONSTRAINT "match_post_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "match_posts" DROP CONSTRAINT "match_posts_football_field_id_fkey";

-- DropForeignKey
ALTER TABLE "match_posts" DROP CONSTRAINT "match_posts_user_id_fkey";

-- DropTable
DROP TABLE "match_post_participants";

-- DropTable
DROP TABLE "match_posts";

-- DropEnum
DROP TYPE "MiniPayStatus";

-- DropEnum
DROP TYPE "PostStatus";

-- CreateTable
CREATE TABLE "casual_matches" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "total_slots" INTEGER NOT NULL,
    "available_slots" INTEGER NOT NULL,
    "occupied_slots" INTEGER NOT NULL DEFAULT 0,
    "slot_price" DECIMAL(12,2) NOT NULL,
    "skill_level" "SkillLevel" NOT NULL DEFAULT 'ANY',
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "CasualMatchStatus" NOT NULL DEFAULT 'OPEN',
    "team_mode" "TeamMode" NOT NULL DEFAULT 'NO_TEAM',
    "join_deadline" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "casual_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casual_match_participants" (
    "id" TEXT NOT NULL,
    "casual_match_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot_count" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_status" "ParticipantPayStatus" NOT NULL DEFAULT 'UNPAID',
    "join_status" "JoinStatus" NOT NULL DEFAULT 'PENDING',
    "selected_team" "TeamSide",
    "joined_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "reserved_until" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "casual_match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "casual_matches_booking_id_key" ON "casual_matches"("booking_id");

-- CreateIndex
CREATE INDEX "casual_matches_status_visibility_idx" ON "casual_matches"("status", "visibility");

-- CreateIndex
CREATE INDEX "casual_matches_host_id_status_idx" ON "casual_matches"("host_id", "status");

-- CreateIndex
CREATE INDEX "casual_matches_deleted_at_idx" ON "casual_matches"("deleted_at");

-- CreateIndex
CREATE INDEX "casual_match_participants_casual_match_id_join_status_idx" ON "casual_match_participants"("casual_match_id", "join_status");

-- CreateIndex
CREATE INDEX "casual_match_participants_user_id_join_status_idx" ON "casual_match_participants"("user_id", "join_status");

-- CreateIndex
CREATE INDEX "casual_match_participants_reserved_until_idx" ON "casual_match_participants"("reserved_until");

-- CreateIndex
CREATE UNIQUE INDEX "casual_match_participants_casual_match_id_user_id_key" ON "casual_match_participants"("casual_match_id", "user_id");

-- AddForeignKey
ALTER TABLE "casual_matches" ADD CONSTRAINT "casual_matches_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casual_matches" ADD CONSTRAINT "casual_matches_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casual_match_participants" ADD CONSTRAINT "casual_match_participants_casual_match_id_fkey" FOREIGN KEY ("casual_match_id") REFERENCES "casual_matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casual_match_participants" ADD CONSTRAINT "casual_match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
