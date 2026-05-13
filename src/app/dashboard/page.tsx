import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrencyIdr } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { orderScopeForRole } from "@/lib/order-access";
import { getDashboardStats } from "@/lib/queries/dashboard-stats";
import { PLAN_LIMITS } from "@/lib/plans";
import { effectivePlanForLimits } from "@/lib/subscription-state";
import { DashboardTips } from "@/components/dashboard/dashboard-tips";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Ringkasan",
};

export default async function DashboardHomePage() {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!businessId || !role || !userId) return null;

  const statsCtx =
    role === "PEGAWAI" ? { role, userId } : undefined;

  const orderWhere = orderScopeForRole(businessId, role, userId);

  const [business, stats, recentOrders] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    getDashboardStats(businessId, statsCtx),
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  if (!business) return null;

  const plan = effectivePlanForLimits(business);
  const limits = PLAN_LIMITS[plan];

  return (
    <div className="space-y-8">
      <DashboardTips />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ringkasan</h2>
          <p className="text-muted-foreground">
            Pantau pelanggan, order aktif, dan pemasukan bulan ini.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Paket: {plan}</Badge>
          {limits.maxCustomers !== null ? (
            <Badge variant="outline">
              Pelanggan: {stats.totalCustomers}/{limits.maxCustomers}
            </Badge>
          ) : (
            <Badge variant="outline">Pelanggan unlimited</Badge>
          )}
        </div>
      </div>

      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Langganan SaaS
            </div>
            <CardTitle className="text-xl">Paket & perpanjangan</CardTitle>
            <CardDescription>
              Limit fitur mengikuti paket efektif{" "}
              <span className="font-semibold text-foreground">{plan}</span>
              {business.plan !== plan ? (
                <>
                  {" "}
                  (kontrak:{" "}
                  <span className="font-medium text-foreground">
                    {business.plan}
                  </span>
                  )
                </>
              ) : null}
              .
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/dashboard/billing">Kelola billing</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-card/80 px-3 py-2">
            <p className="text-muted-foreground">Status langganan</p>
            <p className="font-semibold">{business.subscriptionStatus}</p>
          </div>
          <div className="rounded-lg border bg-card/80 px-3 py-2">
            <p className="text-muted-foreground">Berakhir / perpanjangan</p>
            <p className="font-semibold">
              {business.subscriptionEndsAt
                ? format(business.subscriptionEndsAt, "d MMMM yyyy", {
                    locale: localeId,
                  })
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total pelanggan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <CardDescription className="mt-1">
              Data unik di bisnis Anda
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total order</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <CardDescription className="mt-1">
              Semua status order
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order aktif</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <CardDescription className="mt-1">
              Pending & sedang diproses
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pemasukan bulan ini
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyIdr(stats.revenueMonth)}
            </div>
            <CardDescription className="mt-1">
              Order selesai & diambil
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Order terbaru</CardTitle>
            <CardDescription>6 entri terakhir di tenant Anda</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/orders">
              Lihat semua
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada order. Tambah pelanggan lalu buat order pertama.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{o.title}</p>
                      <Badge variant="secondary" className="shrink-0">
                        Aktif
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {o.customer.name} · {ORDER_STATUS_LABEL[o.status]}
                      {o.description ? ` · ${o.description}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dibuat{" "}
                      {format(o.createdAt, "d MMM yyyy HH:mm", {
                        locale: localeId,
                      })}
                      {o.updatedAt.getTime() !== o.createdAt.getTime()
                        ? ` · diubah ${format(o.updatedAt, "d MMM yyyy", {
                            locale: localeId,
                          })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <p className="text-sm font-semibold">
                      {formatCurrencyIdr(Number(o.amount))}
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/orders/${o.id}`}>Detail order</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
