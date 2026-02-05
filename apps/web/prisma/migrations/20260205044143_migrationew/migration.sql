/*
  Warnings:

  - You are about to drop the column `employeeCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `shift` on the `User` table. All the data in the column will be lost.
  - Made the column `createdById` on table `Incident` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `testType` on the `Transfer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransferScope" AS ENUM ('URGENCIAS', 'PLANTA');

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_createdById_fkey";

-- DropIndex
DROP INDEX "User_employeeCode_key";

-- AlterTable
ALTER TABLE "Incident" ALTER COLUMN "createdById" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transfer" ALTER COLUMN "priority" DROP DEFAULT,
ALTER COLUMN "status" DROP DEFAULT,
DROP COLUMN "testType",
ADD COLUMN     "testType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "employeeCode",
DROP COLUMN "lastLoginAt",
DROP COLUMN "notes",
DROP COLUMN "shift",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
