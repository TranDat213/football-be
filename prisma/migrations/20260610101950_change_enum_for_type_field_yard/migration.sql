/*
  Warnings:

  - The `type` column on the `field_yards` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "YardType" AS ENUM ('FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE');

-- AlterTable
ALTER TABLE "field_yards" DROP COLUMN "type",
ADD COLUMN     "type" "YardType" NOT NULL DEFAULT 'FIVE_A_SIDE';
