/*
  Warnings:

  - Added the required column `createdById` to the `Transfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "createdById" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
