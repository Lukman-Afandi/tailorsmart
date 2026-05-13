import type { SubscriptionPlan } from "@prisma/client";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  formatIdr,
  planGrossAmountIdr,
  planMarketingLabel,
  type PaidSubscriptionPlan,
} from "@/lib/billing/plan-pricing";
import { MidtransUpgradeButton } from "@/components/billing/midtrans-upgrade-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TIERS: SubscriptionPlan[] = ["FREE", "BASIC", "PROFESSIONAL"];

const FEATURE_LABELS: Record<string, string> = {
  maxCustomers: "Maks pelanggan",
  maxOrdersPerMonth: "Maks order / bulan",
  maxOrderUploadsPerMonth: "Upload lampiran / bulan",
  maxAttachmentsPerOrder: "Lampiran per order",
  exportPdf: "Export PDF",
  exportExcel: "Export Excel",
  reminders: "Reminder pelanggan",
  multiStaff: "Multi staf",
  fullAnalytics: "Analitik penuh",
  aiSizeRecommendation: "Rekomendasi ukuran AI",
  prioritySupport: "Prioritas support",
};

function formatLimit(v: boolean | number | null): string {
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (v === null) return "Tanpa batas";
  return String(v);
}

export function SubscriptionPricingCards({
  variant,
  currentPlan,
  midtransConfigured,
  suspended,
}: {
  variant: "marketing" | "dashboard";
  currentPlan?: SubscriptionPlan;
  /** Hanya dashboard: tombol Snap membutuhkan env Midtrans. */
  midtransConfigured?: boolean;
  suspended?: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {TIERS.map((plan) => {
        const limits = PLAN_LIMITS[plan];
        const isCurrent = currentPlan === plan;
        const highlight = plan === "PROFESSIONAL";

        return (
          <Card
            key={plan}
            className={cn(
              "relative flex flex-col border-border/80 shadow-sm transition-shadow",
              highlight && "border-primary/40 shadow-md ring-1 ring-primary/15",
              isCurrent && variant === "dashboard" && "ring-2 ring-primary/30",
            )}
          >
            {highlight ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="shadow-sm">Paling lengkap</Badge>
              </div>
            ) : null}
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-xl">
                {planMarketingLabel(plan)}
                {isCurrent && variant === "dashboard" ? (
                  <Badge variant="secondary">Aktif</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>
                {plan === "FREE" ? (
                  <>Mulai tanpa kartu — cocok uji coba.</>
                ) : plan === "BASIC" ? (
                  <>Untuk bengkel dengan volume harian stabil.</>
                ) : (
                  <>Cabang, staf, analitik, dan AI ukuran.</>
                )}
              </CardDescription>
              <div className="pt-2">
                {plan === "FREE" ? (
                  <p className="text-3xl font-bold tracking-tight">Rp0</p>
                ) : (
                  <p className="text-3xl font-bold tracking-tight">
                    {formatIdr(planGrossAmountIdr(plan))}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / 30 hari
                    </span>
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <ul className="space-y-2 text-sm">
                {Object.entries(limits).map(([key, val]) => (
                  <li key={key} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      <span className="text-muted-foreground">
                        {FEATURE_LABELS[key] ?? key}:{" "}
                      </span>
                      <span className="font-medium">{formatLimit(val)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 border-t bg-muted/30 pt-4">
              {variant === "marketing" ? (
                <>
                  {plan === "FREE" ? (
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/register">Daftar gratis</Link>
                    </Button>
                  ) : (
                    <Button className="w-full" asChild>
                      <Link href="/login">Masuk untuk berlangganan</Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {plan === "FREE" ? (
                    <p className="text-center text-xs text-muted-foreground">
                      Paket default — tidak perlu pembayaran.
                    </p>
                  ) : isCurrent ? (
                    <p className="text-center text-xs text-muted-foreground">
                      Anda sudah di paket ini.
                    </p>
                  ) : !midtransConfigured ? (
                    <p className="text-center text-xs text-destructive">
                      Midtrans belum dikonfigurasi (server key / client key).
                    </p>
                  ) : suspended ? (
                    <p className="text-center text-xs text-destructive">
                      Tenant ditangguhkan — hubungi support.
                    </p>
                  ) : (
                    <MidtransUpgradeButton
                      plan={plan as PaidSubscriptionPlan}
                      disabled={false}
                      label={`Upgrade ke ${planMarketingLabel(plan)}`}
                    />
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
