"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionPlan, TenantSubscriptionStatus } from "@prisma/client";
import { changePlanLocalAction } from "@/actions/billing-actions";
import { PLAN_LIMITS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const PLANS: SubscriptionPlan[] = ["FREE", "BASIC", "PROFESSIONAL"];

export function BillingClient({
  plan,
  subscriptionStatus,
  trialDaysRemaining,
  suspended,
}: {
  plan: SubscriptionPlan;
  subscriptionStatus: TenantSubscriptionStatus;
  trialDaysRemaining: number | null;
  suspended: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(to: SubscriptionPlan) {
    startTransition(async () => {
      const res = await changePlanLocalAction(to);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Gagal",
          description: res.error,
        });
        return;
      }
      toast({ title: "Paket diperbarui", description: `Sekarang: ${to}` });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>Status langganan</CardTitle>
          <CardDescription>
            Status: <Badge variant="secondary">{subscriptionStatus}</Badge> · Paket
            aktif: <Badge>{plan}</Badge>
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
            <p className="text-destructive">Tenant ditangguhkan — fitur tulis dinonaktifkan.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upgrade / downgrade</CardTitle>
          <CardDescription>
            Simulasi lokal — gateway memanggil{" "}
            <code className="text-xs">applyPlanToBusiness</code> setelah pembayaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PLANS.map((p) => (
            <Button
              key={p}
              variant={p === plan ? "default" : "outline"}
              size="sm"
              disabled={pending || p === plan || suspended}
              onClick={() => change(p)}
            >
              {p}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Limit paket {plan}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(PLAN_LIMITS[plan]).map(([k, v]) => (
            <div key={k} className="flex justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{String(v)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
