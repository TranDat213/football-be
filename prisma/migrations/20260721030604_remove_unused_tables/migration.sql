/*
  Warnings:

  - You are about to drop the `conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `field_review_reactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `field_reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payouts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "field_review_reactions" DROP CONSTRAINT "field_review_reactions_review_id_fkey";

-- DropForeignKey
ALTER TABLE "field_review_reactions" DROP CONSTRAINT "field_review_reactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "field_reviews" DROP CONSTRAINT "field_reviews_field_id_fkey";

-- DropForeignKey
ALTER TABLE "field_reviews" DROP CONSTRAINT "field_reviews_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "field_reviews" DROP CONSTRAINT "field_reviews_user_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "payouts" DROP CONSTRAINT "payouts_owner_id_fkey";

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "owner_cancelled_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "conversations";

-- DropTable
DROP TABLE "field_review_reactions";

-- DropTable
DROP TABLE "field_reviews";

-- DropTable
DROP TABLE "messages";

-- DropTable
DROP TABLE "payouts";

-- DropEnum
DROP TYPE "MessageRole";

-- DropEnum
DROP TYPE "PayoutStatus";

-- DropEnum
DROP TYPE "ReactionType";

-- DropEnum
DROP TYPE "ReviewStatus";
