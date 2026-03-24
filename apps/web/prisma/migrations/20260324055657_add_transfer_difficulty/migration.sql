-- CreateEnum
CREATE TYPE "TransferDifficulty" AS ENUM ('BANAL', 'MODERADO', 'CRITICO');

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "difficulty" "TransferDifficulty" NOT NULL DEFAULT 'MODERADO';
