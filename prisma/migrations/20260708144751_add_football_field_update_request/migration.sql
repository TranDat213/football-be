-- CreateEnum
CREATE TYPE "FootballFieldUpdateRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "football_field_update_requests" (
    "id" TEXT NOT NULL,
    "football_field_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "FootballFieldUpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "football_field_update_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "football_field_update_requests_football_field_id_status_idx" ON "football_field_update_requests"("football_field_id", "status");

-- AddForeignKey
ALTER TABLE "football_field_update_requests" ADD CONSTRAINT "football_field_update_requests_football_field_id_fkey" FOREIGN KEY ("football_field_id") REFERENCES "football_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_field_update_requests" ADD CONSTRAINT "football_field_update_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "football_field_update_requests" ADD CONSTRAINT "football_field_update_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
