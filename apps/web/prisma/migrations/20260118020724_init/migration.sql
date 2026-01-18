/*
  Warnings:

  - Added the required column `dob` to the `Transfer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Transfer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mrn` to the `Transfer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientFullName` to the `Transfer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testType` to the `Transfer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('RM', 'ECO', 'RX', 'MEDICINA_NUCLEAR', 'TC');

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "dob" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "mrn" TEXT NOT NULL,
ADD COLUMN     "patientFullName" TEXT NOT NULL,
ADD COLUMN     "testType" "TestType" NOT NULL;
