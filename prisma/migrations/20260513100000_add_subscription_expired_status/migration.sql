-- TenantSubscriptionStatus: EXPIRED (langganan berbayar habis masa)
DO $$
BEGIN
  ALTER TYPE "TenantSubscriptionStatus" ADD VALUE 'EXPIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
