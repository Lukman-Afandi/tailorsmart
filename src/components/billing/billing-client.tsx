"use client";

import Link from "next/link";
import type { SubscriptionPlan, TenantSubscriptionStatus } from "@prisma/client";
import { SubscriptionPricingCards } from "@/components/billing/subscription-pricing-cards";
import { PLAN_LIMITS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BillingClient({
  plan,
  subscriptionStatus,
  trialDaysRemaining,
  suspended,
  midtransConfigured,
}: {
  plan: SubscriptionPlan;
  subscriptionStatus: TenantSubscriptionStatus;
  trialDaysRemaining: number | null;
  suspended: boolean;
  midtransConfigured: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle>Status langganan</CardTitle>
            <CardDescription>
              Status:{" "}
              <Badge variant="secondary">{subscriptionStatus}</Badge> · Paket
              kontrak: <Badge>{plan}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {trialDaysRemaining !== null ? (
              <p>
                Trial tersisa:{" "}
                <span className="font-semibold text-foreground">
                  {trialDaysRemaining} hari
                </span>{" "}
                (fitur PRO selama trial).
              </p>
            ) : (
              <p>Tidak dalam periode trial.</p>
            )}
            {suspended ? (
              <p className="text-destructive">
                Tenant ditangguhkan — fitur tulis dinonaktifkan.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/billing/history">Riwayat pembayaran</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pricing">Lihat halaman harga publik</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limit paket {plan}</CardTitle>
            <CardDescription>
              Batas fitur mengikuti paket kontrak (trial PRO memakai limit
              Professional).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(PLAN_LIMITS[plan]).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between rounded-md border px-3 py-2"
              >
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Paket & upgrade</h3>
          <p className="text-sm text-muted-foreground">
            Upgrade ke Basic atau Professional melalui Midtrans Snap. Pembayaran
            diverifikasi di server (signature + status API).
          </p>
        </div>
        <SubscriptionPricingCards
          variant="dashboard"
          currentPlan={plan}
          midtransConfigured={midtransConfigured}
          suspended={suspended}
        />
      </div>
    </div>
  );
}
