import "server-only";

import type { BillingProvider, SubscriptionPlan } from "@prisma/client";
import {
  BillingProvider as BillingProviderValue,
  TenantSubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { BillingTransactionStatus } from "@/lib/billing/billing-transaction-status";

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

type PlanApplyMeta = {
  provider?: BillingProvider;
  externalId?: string;
  amount?: number;
  raw?: unknown;
  /** Jika diset (termasuk `null`), mengisi / mengosongkan subscriptionEndsAt. */
  subscriptionEndsAt?: Date | null;
};

/** Upgrade/downgrade lokal (gateway memanggil setelah pembayaran sukses). */
export async function applyPlanToBusiness(
  businessId: string,
  plan: SubscriptionPlan,
  meta?: PlanApplyMeta,
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
        subscriptionStatus: TenantSubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        ...(meta?.provider ? { billingProvider: meta.provider } : {}),
        ...(meta?.subscriptionEndsAt !== undefined
          ? { subscriptionEndsAt: meta.subscriptionEndsAt }
          : {}),
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

/** Setelah pembayaran Midtrans sukses — satu transaksi DB. */
export async function finalizePaidSubscriptionFromMidtrans(input: {
  businessId: string;
  billingTransactionId: string;
  plan: SubscriptionPlan;
  amountIdr: number;
  paidAt: Date;
  subscriptionEndsAt: Date;
  raw?: unknown;
}) {
  const prev = await prisma.business.findUniqueOrThrow({
    where: { id: input.businessId },
    select: { plan: true },
  });

  await prisma.$transaction([
    prisma.billingTransaction.update({
      where: {
        id: input.billingTransactionId,
        businessId: input.businessId,
      },
      data: {
        status: BillingTransactionStatus.PAID,
        paidAt: input.paidAt,
        expiresAt: input.subscriptionEndsAt,
      },
    }),
    prisma.business.update({
      where: { id: input.businessId },
      data: {
        plan: input.plan,
        subscriptionStatus: TenantSubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        subscriptionEndsAt: input.subscriptionEndsAt,
        billingProvider: BillingProviderValue.MIDTRANS,
      },
    }),
    prisma.subscriptionEvent.create({
      data: {
        businessId: input.businessId,
        fromPlan: prev.plan,
        toPlan: input.plan,
        provider: BillingProviderValue.MIDTRANS,
        externalId: input.billingTransactionId,
        amount: input.amountIdr,
        raw: input.raw === undefined ? undefined : (input.raw as object),
      },
    }),
  ]);

  logger.info("billing.midtrans_subscription_finalized", {
    businessId: input.businessId,
    billingTransactionId: input.billingTransactionId,
    plan: input.plan,
  });
}
