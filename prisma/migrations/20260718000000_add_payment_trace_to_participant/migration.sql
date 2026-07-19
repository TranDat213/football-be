-- AlterTable
ALTER TABLE "casual_match_participants" ADD COLUMN "transaction_code" VARCHAR(100),
ADD COLUMN "gateway_response" JSONB,
ADD COLUMN "paid_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "casual_match_participants_transaction_code_key" ON "casual_match_participants"("transaction_code");
