import "server-only";

import type { BillingProvider, SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function recordPlanChange(input: {
  businessId: string;
  fromPlan: SubscriptionPlan | null;
  toPlan: SubscriptionPlan;
  provider?: BillingProvider;
  externalId?: string;
  amount?: number;
  raw?: unknown;
}) {
  await prisma.subscriptionEvent.create({
    data: {
      businessId: input.businessId,
      fromPlan: input.fromPlan ?? undefined,
      toPlan: input.toPlan,
      provider: input.provider,
      externalId: input.externalId,
      amount: input.amount,
      raw: input.raw === undefined ? undefined : (input.raw as object),
    },
  });
  logger.info("billing.plan_change_recorded", {
    businessId: input.businessId,
    toPlan: input.toPlan,
  });
}

/** Upgrade/downgrade lokal (gateway memanggil setelah pembayaran sukses). */
export async function applyPlanToBusiness(
  businessId: string,
  plan: SubscriptionPlan,
  meta?: { provider?: BillingProvider; externalId?: string; amount?: number; raw?: unknown },
) {
  const prev = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { plan: true },
  });
  await prisma.$transaction([
    prisma.business.update({
      where: { id: businessId },
      data: {
        plan,
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
        ...(meta?.provider ? { billingProvider: meta.provider } : {}),
      },
    }),
    prisma.subscriptionEvent.create({
      data: {
        businessId,
        fromPlan: prev.plan,
        toPlan: plan,
        provider: meta?.provider,
        externalId: meta?.externalId,
        amount: meta?.amount,
        raw: meta?.raw === undefined ? undefined : (meta.raw as object),
      },
    }),
  ]);
}
