/*
  Warnings:

  - You are about to drop the column `destination` on the `Transfer` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Transfer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transfer" DROP COLUMN "destination",
DROP COLUMN "origin";
