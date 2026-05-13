import "server-only";

import { SubscriptionPlan, TenantSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Jika masa langganan berbayar sudah lewat, turunkan ke FREE dan tandai EXPIRED.
 * Dipanggil dari server (mis. layout dashboard) — bukan Edge middleware (butuh Prisma).
 */
export async function applyExpiredSubscriptionIfNeeded(
  businessId: string,
): Promise<void> {
  const now = new Date();
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      plan: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
  });
  if (!business?.subscriptionEndsAt) return;
  if (business.subscriptionEndsAt >= now) return;
  if (
    business.plan === SubscriptionPlan.FREE &&
    business.subscriptionStatus === TenantSubscriptionStatus.EXPIRED
  ) {
    return;
  }

  const fromPlan = business.plan;

  await prisma.$transaction([
    prisma.business.update({
      where: { id: businessId },
      data: {
        plan: SubscriptionPlan.FREE,
        subscriptionStatus: TenantSubscriptionStatus.EXPIRED,
      },
    }),
    prisma.subscriptionEvent.create({
      data: {
        businessId,
        fromPlan,
        toPlan: SubscriptionPlan.FREE,
        raw: { source: "subscription_expiry_cron", expiredAt: now.toISOString() },
      },
    }),
  ]);

  logger.info("subscription.expired_applied", {
    businessId,
    fromPlan,
    endedAt: business.subscriptionEndsAt.toISOString(),
  });
}
