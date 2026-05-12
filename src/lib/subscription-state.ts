import "server-only";

import type { SubscriptionPlan, TenantSubscriptionStatus } from "@prisma/client";
import { TenantSubscriptionStatus as TS } from "@prisma/client";
import { PLAN_LIMITS, type PlanLimits } from "@/lib/plans";

export type BusinessSubscriptionFields = {
  plan: SubscriptionPlan;
  subscriptionStatus: TenantSubscriptionStatus;
  trialEndsAt: Date | null;
  suspendedAt: Date | null;
};

/** Paket efektif untuk limit fitur (trial = PRO). */
export function effectivePlanForLimits(
  b: BusinessSubscriptionFields,
): SubscriptionPlan {
  if (b.suspendedAt) return b.plan;
  if (
    b.subscriptionStatus === TS.TRIALING &&
    b.trialEndsAt &&
    b.trialEndsAt > new Date()
  ) {
    return "PROFESSIONAL";
  }
  return b.plan;
}

export function planLimitsForBusiness(b: BusinessSubscriptionFields): PlanLimits {
  return PLAN_LIMITS[effectivePlanForLimits(b)];
}

export function isTenantSuspended(b: BusinessSubscriptionFields): boolean {
  return b.suspendedAt != null;
}

export function trialDaysRemaining(b: BusinessSubscriptionFields): number | null {
  if (b.subscriptionStatus !== TS.TRIALING || !b.trialEndsAt) return null;
  const ms = b.trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
