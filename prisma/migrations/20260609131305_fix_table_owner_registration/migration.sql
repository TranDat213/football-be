/*
  Warnings:

  - You are about to drop the `OwnerRegistration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OwnerRegistration" DROP CONSTRAINT "OwnerRegistration_userId_fkey";

-- DropTable
DROP TABLE "OwnerRegistration";

-- CreateTable
CREATE TABLE "owner_registrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "stadium_name" TEXT,
    "address" TEXT,
    "status" "OwnerRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "owner_registrations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "owner_registrations" ADD CONSTRAINT "owner_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
