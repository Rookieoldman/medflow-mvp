-- CreateTable
CREATE TABLE "ShiftChangeLog" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "fromShift"     "Shift",
    "toShift"       "Shift",
    "changedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByRole" TEXT NOT NULL,
    "changedByName" TEXT NOT NULL,

    CONSTRAINT "ShiftChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftChangeLog_userId_idx" ON "ShiftChangeLog"("userId");

-- CreateIndex
CREATE INDEX "ShiftChangeLog_changedAt_idx" ON "ShiftChangeLog"("changedAt");

-- AddForeignKey
ALTER TABLE "ShiftChangeLog" ADD CONSTRAINT "ShiftChangeLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
