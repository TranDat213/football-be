/*
  Warnings:

  - You are about to drop the column `icon` on the `field_categories` table. All the data in the column will be lost.
  - You are about to drop the column `email_verified_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `first_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "field_categories" DROP COLUMN "icon";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verified_at",
DROP COLUMN "full_name",
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "username" VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
