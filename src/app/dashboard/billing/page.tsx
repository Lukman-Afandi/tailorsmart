import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { BillingClient } from "@/components/billing/billing-client";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/role-guard";
import { trialDaysRemaining } from "@/lib/subscription-state";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ suspended?: string }>;
}) {
  await requirePermission(Permission.BILLING_MANAGE);
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) return null;

  const sp = await searchParams;
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const trialLeft = trialDaysRemaining(business);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing & langganan</h2>
        <p className="text-muted-foreground">
          Kelola paket, trial, dan integrasi pembayaran (Midtrans / Xendit).
        </p>
      </div>
      {sp.suspended === "1" ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Akun tenant ditangguhkan. Hubungi support atau tim platform.
        </p>
      ) : null}
      <BillingClient
        plan={business.plan}
        subscriptionStatus={business.subscriptionStatus}
        trialDaysRemaining={trialLeft}
        suspended={!!business.suspendedAt}
      />
      <p className="text-xs text-muted-foreground">
        Pembayaran otomatis: sambungkan webhook di{" "}
        <Link className="underline" href="/api/webhooks/midtrans">
          Midtrans
        </Link>{" "}
        /{" "}
        <Link className="underline" href="/api/webhooks/xendit">
          Xendit
        </Link>{" "}
        (stub siap produksi).
      </p>
    </div>
  );
}
