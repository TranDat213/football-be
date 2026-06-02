-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "YardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOMO', 'VNPAY', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "TeamMode" AS ENUM ('NO_TEAM', 'OPTIONAL_TEAM', 'REQUIRED_TEAM');

-- CreateEnum
CREATE TYPE "TeamSide" AS ENUM ('TEAM_A', 'TEAM_B');

-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MiniPayStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('ANY', 'BEGINNER', 'INTERMEDIATE', 'PRO');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCESS', 'MATCH_JOINED', 'MATCH_APPROVED', 'REVIEW_REPLY', 'NEW_MATCH_POST', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT,
    "phone" VARCHAR(20),
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMP(3),
    "provider" VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    "provider_id" VARCHAR(255),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "icon" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "football_fields" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "category_id" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "ward" VARCHAR(100),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "open_time" TIME,
    "close_time" TIME,
    "status" "FieldStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "football_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_yards" (
    "id" TEXT NOT NULL,
    "football_field_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" "YardStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_yards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_images" (
    "id" TEXT NOT NULL,
    "football_field_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" VARCHAR(255),
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operating_hours" (
    "id" TEXT NOT NULL,
    "field_yard_id" TEXT NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "open_time" TIME NOT NULL,
    "close_time" TIME NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_price_rules" (
    "id" TEXT NOT NULL,
    "field_yard_id" TEXT NOT NULL,
    "day_of_week" SMALLINT,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "special_date" DATE,
    "price" DECIMAL(12,2) NOT NULL,
    "label" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "field_yard_id" TEXT NOT NULL,
    "booking_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "transaction_code" VARCHAR(100),
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paid_at" TIMESTAMP(3),
    "gateway_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_reviews" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "rating" SMALLINT,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_review_reactions" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_review_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "football_field_id" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "match_time" TIMESTAMP(3) NOT NULL,
    "join_deadline" TIMESTAMP(3),
    "max_players" INTEGER NOT NULL,
    "current_players" INTEGER NOT NULL DEFAULT 0,
    "price_per_person" DECIMAL(10,2),
    "skill_level" "SkillLevel" NOT NULL DEFAULT 'ANY',
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "PostStatus" NOT NULL DEFAULT 'OPEN',
    "team_mode" "TeamMode" NOT NULL DEFAULT 'NO_TEAM',
    "team_a_name" VARCHAR(100),
    "team_b_name" VARCHAR(100),
    "team_a_max_slots" INTEGER,
    "team_b_max_slots" INTEGER,
    "team_a_current_slots" INTEGER NOT NULL DEFAULT 0,
    "team_b_current_slots" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "match_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_post_participants" (
    "id" TEXT NOT NULL,
    "match_post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "selected_team" "TeamSide",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(10,2),
    "payment_status" "MiniPayStatus" NOT NULL DEFAULT 'UNPAID',
    "join_status" "JoinStatus" NOT NULL DEFAULT 'PENDING',
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "match_post_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "embedding_id" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "field_categories_slug_key" ON "field_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "football_fields_slug_key" ON "football_fields"("slug");

-- CreateIndex
CREATE INDEX "football_fields_owner_id_status_idx" ON "football_fields"("owner_id", "status");

-- CreateIndex
CREATE INDEX "football_fields_province_district_idx" ON "football_fields"("province", "district");

-- CreateIndex
CREATE INDEX "football_fields_latitude_longitude_idx" ON "football_fields"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "football_fields_deleted_at_idx" ON "football_fields"("deleted_at");

-- CreateIndex
CREATE INDEX "field_yards_football_field_id_idx" ON "field_yards"("football_field_id");

-- CreateIndex
CREATE INDEX "field_images_football_field_id_sort_order_idx" ON "field_images"("football_field_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "field_operating_hours_field_yard_id_day_of_week_key" ON "field_operating_hours"("field_yard_id", "day_of_week");

-- CreateIndex
CREATE INDEX "field_price_rules_field_yard_id_day_of_week_special_date_idx" ON "field_price_rules"("field_yard_id", "day_of_week", "special_date");

-- CreateIndex
CREATE INDEX "bookings_field_yard_id_booking_date_start_time_end_time_idx" ON "bookings"("field_yard_id", "booking_date", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX "bookings_booking_date_status_idx" ON "bookings"("booking_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_code_key" ON "payments"("transaction_code");

-- CreateIndex
CREATE INDEX "field_reviews_field_id_status_deleted_at_idx" ON "field_reviews"("field_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "field_reviews_user_id_created_at_idx" ON "field_reviews"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "field_reviews_parent_id_idx" ON "field_reviews"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_review_reactions_review_id_user_id_key" ON "field_review_reactions"("review_id", "user_id");

-- CreateIndex
CREATE INDEX "match_posts_status_visibility_match_time_idx" ON "match_posts"("status", "visibility", "match_time");

-- CreateIndex
CREATE INDEX "match_posts_user_id_status_idx" ON "match_posts"("user_id", "status");

-- CreateIndex
CREATE INDEX "match_post_participants_match_post_id_join_status_idx" ON "match_post_participants"("match_post_id", "join_status");

-- CreateIndex
CREATE INDEX "match_post_participants_user_id_join_status_idx" ON "match_post_participants"("user_id", "join_status");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_created_at_idx" ON "notifications"("recipient_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_entity_type_entity_id_idx" ON "notifications"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "conversations_user_id_updated_at_idx" ON "conversations"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "football_fields" ADD CONSTRAINT "football_fields_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_fields" ADD CONSTRAINT "football_fields_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "field_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_yards" ADD CONSTRAINT "field_yards_football_field_id_fkey" FOREIGN KEY ("football_field_id") REFERENCES "football_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_images" ADD CONSTRAINT "field_images_football_field_id_fkey" FOREIGN KEY ("football_field_id") REFERENCES "football_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operating_hours" ADD CONSTRAINT "field_operating_hours_field_yard_id_fkey" FOREIGN KEY ("field_yard_id") REFERENCES "field_yards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_price_rules" ADD CONSTRAINT "field_price_rules_field_yard_id_fkey" FOREIGN KEY ("field_yard_id") REFERENCES "field_yards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_field_yard_id_fkey" FOREIGN KEY ("field_yard_id") REFERENCES "field_yards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reviews" ADD CONSTRAINT "field_reviews_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "football_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reviews" ADD CONSTRAINT "field_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reviews" ADD CONSTRAINT "field_reviews_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "field_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_review_reactions" ADD CONSTRAINT "field_review_reactions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "field_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_review_reactions" ADD CONSTRAINT "field_review_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_posts" ADD CONSTRAINT "match_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_posts" ADD CONSTRAINT "match_posts_football_field_id_fkey" FOREIGN KEY ("football_field_id") REFERENCES "football_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_post_participants" ADD CONSTRAINT "match_post_participants_match_post_id_fkey" FOREIGN KEY ("match_post_id") REFERENCES "match_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_post_participants" ADD CONSTRAINT "match_post_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
