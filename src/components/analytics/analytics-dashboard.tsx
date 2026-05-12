"use client";

import { useMemo } from "react";
import type { SubscriptionPlan } from "@prisma/client";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyIdr } from "@/lib/utils";
import type { AnalyticsDayPoint } from "@/lib/queries/analytics-series";
import { AiBusinessInsights } from "@/components/analytics/ai-business-insights";

export function AnalyticsDashboard({
  plan,
  fullAnalytics,
  showAiInsights,
  series,
}: {
  plan: SubscriptionPlan;
  fullAnalytics: boolean;
  /** Insight AI hanya untuk pemilik dengan paket PRO + permission penuh. */
  showAiInsights: boolean;
  series: AnalyticsDayPoint[];
}) {
  const data = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        label: format(parseISO(`${p.day}T12:00:00`), "d MMM", { locale: id }),
      })),
    [series],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analitik operasional</h2>
          <p className="text-muted-foreground">
            Pemasukan (order selesai & diambil) dan volume order — cache 2 menit per tenant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Paket {plan}</Badge>
          {fullAnalytics ? (
            <Badge variant="outline">Mode PRO · insight lanjutan</Badge>
          ) : (
            <Badge variant="outline">Upgrade PRO untuk limit tanpa batas</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Grafik pemasukan harian</CardTitle>
            <CardDescription>
              Akumulasi nominal order berstatus selesai / diambil (14 hari).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(Number(v))
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const v = payload[0]?.value;
                    return (
                      <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
                        {formatCurrencyIdr(Number(v))}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Pemasukan"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Grafik jumlah order</CardTitle>
            <CardDescription>Semua status — indikator beban produksi.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="orders"
                  fill="hsl(var(--primary) / 0.35)"
                  radius={[6, 6, 0, 0]}
                  name="Order"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <AiBusinessInsights enabled={showAiInsights} />
    </div>
  );
}
