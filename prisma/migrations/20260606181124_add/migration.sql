-- CreateEnum
CREATE TYPE "OwnerRegistrationStatus" AS ENUM ('PENDING', 'CONTACTING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "OwnerRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "stadiumName" TEXT,
    "address" TEXT,
    "status" "OwnerRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "OwnerRegistration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OwnerRegistration" ADD CONSTRAINT "OwnerRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
