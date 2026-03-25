-- CreateTable
CREATE TABLE "TransferEvent" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "fromStatus" "TransferStatus",
    "toStatus" "TransferStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TransferEvent" ADD CONSTRAINT "TransferEvent_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferEvent" ADD CONSTRAINT "TransferEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
