ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "BillingTransaction" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" "BillingProvider" NOT NULL DEFAULT 'MIDTRANS',
  "plan" "SubscriptionPlan" NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "externalId" TEXT,
  "paidAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingTransaction_businessId_idx"
ON "BillingTransaction"("businessId");

CREATE INDEX IF NOT EXISTS "BillingTransaction_status_idx"
ON "BillingTransaction"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'BillingTransaction_businessId_fkey'
  ) THEN
    ALTER TABLE "BillingTransaction"
    ADD CONSTRAINT "BillingTransaction_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;