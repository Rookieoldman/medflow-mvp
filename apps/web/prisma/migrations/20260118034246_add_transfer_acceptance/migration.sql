-- CreateTable
CREATE TABLE "TransferAcceptance" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT,
    "signatureData" TEXT NOT NULL,
    "celadorId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferAcceptance_transferId_key" ON "TransferAcceptance"("transferId");

-- AddForeignKey
ALTER TABLE "TransferAcceptance" ADD CONSTRAINT "TransferAcceptance_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferAcceptance" ADD CONSTRAINT "TransferAcceptance_celadorId_fkey" FOREIGN KEY ("celadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
