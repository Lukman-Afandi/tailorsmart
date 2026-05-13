import type { SubscriptionPlan } from "@prisma/client";

export const PAID_SUBSCRIPTION_PLANS = ["BASIC", "PROFESSIONAL"] as const;

export type PaidSubscriptionPlan = (typeof PAID_SUBSCRIPTION_PLANS)[number];

export function isPaidSubscriptionPlan(
  plan: SubscriptionPlan,
): plan is PaidSubscriptionPlan {
  return plan === "BASIC" || plan === "PROFESSIONAL";
}

/** Harga per periode (30 hari) dalam IDR — override lewat env. */
export function planGrossAmountIdr(plan: PaidSubscriptionPlan): number {
  const raw =
    plan === "BASIC"
      ? process.env.BILLING_BASIC_AMOUNT_IDR
      : process.env.BILLING_PROFESSIONAL_AMOUNT_IDR;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return plan === "BASIC" ? 149_000 : 349_000;
}

export function planMarketingLabel(plan: SubscriptionPlan): string {
  switch (plan) {
    case "FREE":
      return "Free";
    case "BASIC":
      return "Basic";
    case "PROFESSIONAL":
      return "Professional";
    default:
      return plan;
  }
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
