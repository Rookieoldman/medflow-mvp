/*
  Warnings:

  - The values [EN_CAMINO_PRUEBA,EN_ESPERA,EN_LA_PRUEBA,VUELTA] on the enum `TransferStatus` will be removed. If these variants are still used in the database, this will fail.
  - Changed the type of `testType` on the `Transfer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransferStatus_new" AS ENUM ('SOLICITADO', 'ASIGNADO', 'EN_CURSO', 'EN_PRUEBA', 'FINALIZADO', 'PAUSADO', 'CANCELADO');
ALTER TABLE "Transfer" ALTER COLUMN "status" TYPE "TransferStatus_new" USING ("status"::text::"TransferStatus_new");
ALTER TABLE "Transfer" ALTER COLUMN "previousStatus" TYPE "TransferStatus_new" USING ("previousStatus"::text::"TransferStatus_new");
ALTER TYPE "TransferStatus" RENAME TO "TransferStatus_old";
ALTER TYPE "TransferStatus_new" RENAME TO "TransferStatus";
DROP TYPE "public"."TransferStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Transfer" DROP COLUMN "testType",
ADD COLUMN     "testType" "TestType" NOT NULL;
