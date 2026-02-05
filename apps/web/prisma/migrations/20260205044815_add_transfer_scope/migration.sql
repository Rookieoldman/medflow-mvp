-- Add columns to Transfer
ALTER TABLE "Transfer"
ADD COLUMN IF NOT EXISTS "scope" "TransferScope" NOT NULL DEFAULT 'PLANTA',
ADD COLUMN IF NOT EXISTS "requiresAcceptance" BOOLEAN NOT NULL DEFAULT true;