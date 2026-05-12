import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { auth } from "@/auth";
import { Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/role-guard";
import { formatCurrencyIdr } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PLAN_LIMITS } from "@/lib/plans";
import { effectivePlanForLimits } from "@/lib/subscription-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerAiPanel } from "@/components/customers/customer-ai-panel";
import { CustomerOrdersClient } from "@/components/customers/customer-orders-client";
import {
  normalizeBodyMeasurements,
  measurementsForAi,
  type NormalizedBodyMeasurements,
} from "@/lib/body-measurements";

const CELANA_LABELS: [keyof NormalizedBodyMeasurements["celana"], string][] = [
    ["panjang", "Panjang"],
    ["bawah", "Bawah"],
    ["lutut", "Lutut"],
    ["paha", "Paha"],
    ["kilMistak", "Kil/mistak"],
    ["pinggang", "Pinggang"],
    ["pinggul", "Pinggul"],
  ];

const BAJU_LABELS: [keyof NormalizedBodyMeasurements["baju"], string][] = [
  ["panjang", "Panjang"],
  ["lingkarDada", "Lingkar dada"],
  ["pinggang", "Pinggang"],
  ["pinggul", "Pinggul"],
  ["bahu", "Bahu"],
  ["panjangLengan", "Panjang lengan"],
  ["lingkarLengan", "Lingkar lengan"],
  ["pergelangan", "Pergelangan"],
  ["leher", "Leher"],
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) return { title: "Pelanggan" };

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    select: { name: true },
  });

  return { title: customer?.name ?? "Pelanggan" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(Permission.CUSTOMER_MANAGE);
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) return null;

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
  });

  if (!customer) notFound();

  const [business, customersMini, orderHistory, activeOrders] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.customerOrderHistory.findMany({
      where: { customerId: id, businessId },
      orderBy: { orderCreatedAt: "desc" },
    }),
    prisma.order.findMany({
      where: { customerId: id, businessId },
      select: { id: true },
    }),
  ]);

  const activeIds = new Set(activeOrders.map((o) => o.id));
  const measurements = normalizeBodyMeasurements(customer.bodyMeasurements);
  const effectivePlan = effectivePlanForLimits(business);

  const hasAnyMeasurement =
    Object.values(measurements.celana).some((v) => String(v).trim() !== "") ||
    Object.values(measurements.baju).some((v) => String(v).trim() !== "") ||
    String(measurements.tinggiBadan ?? "").trim() !== "";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/customers">← Kembali</Link>
            </Button>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
          <p className="text-muted-foreground">
            {customer.phone}
            {customer.address ? ` · ${customer.address}` : ""}
          </p>
        </div>

        <CustomerOrdersClient
          businessPlan={effectivePlan}
          customerId={customer.id}
          customers={customersMini}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ukuran</CardTitle>
            <CardDescription>Celana dan baju (cm)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            {!hasAnyMeasurement ? (
              <p className="text-muted-foreground">Belum ada ukuran.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="font-medium">Celana</p>
                  <dl className="grid grid-cols-2 gap-2">
                    {CELANA_LABELS.map(([key, label]) => {
                      const v = measurements.celana[key];
                      if (!String(v).trim()) return null;
                      return (
                        <div key={key} className="contents">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="font-medium">{String(v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Baju</p>
                  <dl className="grid grid-cols-2 gap-2">
                    {BAJU_LABELS.map(([key, label]) => {
                      const v = measurements.baju[key];
                      if (!String(v).trim()) return null;
                      return (
                        <div key={key} className="contents">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="font-medium">{String(v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
                {String(measurements.tinggiBadan ?? "").trim() ? (
                  <div className="grid grid-cols-2 gap-2 border-t pt-3">
                    <dt className="text-muted-foreground">Tinggi badan</dt>
                    <dd className="font-medium">{measurements.tinggiBadan}</dd>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <CustomerAiPanel
          plan={effectivePlan}
          measurements={measurementsForAi(measurements)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat order</CardTitle>
          <CardDescription>
            Arsip lengkap untuk pencarian data lama — tetap tersimpan walau order di
            daftar utama sudah dihapus.
            {PLAN_LIMITS[effectivePlan].fullAnalytics ? (
              <span className="ml-2 text-primary">· Analitik lengkap (PRO)</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat order.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {orderHistory.map((h) => {
                const stillActive =
                  h.orderId !== null && activeIds.has(h.orderId);
                const amount =
                  typeof h.amount === "object" &&
                  h.amount !== null &&
                  "toNumber" in h.amount
                    ? (h.amount as { toNumber: () => number }).toNumber()
                    : Number(h.amount);
                return (
                  <li
                    key={h.id}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{h.title}</p>
                        {stillActive ? (
                          <Badge variant="secondary" className="shrink-0">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0">
                            Arsip
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {ORDER_STATUS_LABEL[h.status]}
                        {h.description ? ` · ${h.description}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dibuat{" "}
                        {format(h.orderCreatedAt, "d MMM yyyy HH:mm", {
                          locale: localeId,
                        })}
                        {h.orderUpdatedAt.getTime() !== h.orderCreatedAt.getTime()
                          ? ` · diubah ${format(h.orderUpdatedAt, "d MMM yyyy", { locale: localeId })}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <p className="text-sm font-semibold">
                        {formatCurrencyIdr(amount)}
                      </p>
                      {stillActive && h.orderId ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/orders/${h.orderId}`}>
                            Detail order
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
