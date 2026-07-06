/*
  Warnings:

  - You are about to drop the column `special_date` on the `field_price_rules` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[time_slot_id]` on the table `field_price_rules` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "field_price_rules_time_slot_id_special_date_idx";

-- AlterTable
ALTER TABLE "field_price_rules" DROP COLUMN "special_date";

-- AlterTable
ALTER TABLE "field_time_slots" RENAME CONSTRAINT "field_operating_hours_pkey" TO "field_time_slots_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "field_price_rules_time_slot_id_key" ON "field_price_rules"("time_slot_id");

-- CreateIndex
CREATE INDEX "field_price_rules_time_slot_id_idx" ON "field_price_rules"("time_slot_id");

-- RenameForeignKey
ALTER TABLE "field_time_slots" RENAME CONSTRAINT "field_operating_hours_field_yard_id_fkey" TO "field_time_slots_field_yard_id_fkey";
