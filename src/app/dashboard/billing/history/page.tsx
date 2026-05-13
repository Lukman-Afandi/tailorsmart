import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { BillingProvider } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/role-guard";
import { Permission } from "@/lib/permissions";
import { auth } from "@/auth";
import { formatCurrencyIdr } from "@/lib/utils";
import {
  BillingTransactionStatus,
  BILLING_TRANSACTION_STATUS_LABEL,
} from "@/lib/billing/billing-transaction-status";
import { planMarketingLabel } from "@/lib/billing/plan-pricing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Riwayat billing",
};

function statusVariant(
  s: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case BillingTransactionStatus.PAID:
      return "default";
    case BillingTransactionStatus.PENDING:
      return "secondary";
    case BillingTransactionStatus.FAILED:
    case BillingTransactionStatus.EXPIRED:
    case BillingTransactionStatus.CANCELLED:
      return "destructive";
    default:
      return "outline";
  }
}

function billingProviderLabel(provider: BillingProvider): string {
  switch (provider) {
    case "MIDTRANS":
      return "Midtrans";
    case "XENDIT":
      return "Xendit";
    case "NONE":
      return "—";
    default:
      return provider;
  }
}

function formatMasaAktif(expiresAt: Date | null): string {
  if (!expiresAt) return "-";
  return format(expiresAt, "dd MMM yyyy", { locale: localeId });
}

export default async function BillingHistoryPage() {
  await requirePermission(Permission.BILLING_MANAGE);
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) return null;

  const rows = await prisma.billingTransaction.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/billing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Billing
          </Link>
        </Button>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Riwayat pembayaran</h2>
        <p className="text-muted-foreground">
          Transaksi langganan Midtrans untuk tenant Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaksi</CardTitle>
          <CardDescription>
            Maksimum 100 entri terbaru. Status final mengikuti webhook Midtrans.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi. Mulai upgrade dari halaman billing.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {rows.map((r) => {
                const statusLabel =
                  BILLING_TRANSACTION_STATUS_LABEL[
                    r.status as keyof typeof BILLING_TRANSACTION_STATUS_LABEL
                  ] ?? r.status;
                const masaAktif = formatMasaAktif(r.expiresAt);
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">
                          {planMarketingLabel(r.plan)}
                        </p>
                        <Badge variant="outline" className="shrink-0">
                          Langganan
                        </Badge>
                        <Badge variant={statusVariant(r.status)} className="shrink-0">
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Masa aktif sampai {masaAktif}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dibuat{" "}
                        {format(r.createdAt, "d MMM yyyy HH:mm", {
                          locale: localeId,
                        })}
                        {r.paidAt
                          ? ` · dibayar ${format(r.paidAt, "d MMM yyyy HH:mm", {
                              locale: localeId,
                            })}`
                          : ""}
                      </p>
                      <details className="group pt-1">
                        <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                          Detail order
                        </summary>
                        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                          <dt className="text-muted-foreground">ID order Midtrans</dt>
                          <dd className="break-all font-mono text-xs sm:text-sm">
                            {r.id}
                          </dd>
                          <dt className="text-muted-foreground">Penyedia</dt>
                          <dd>{billingProviderLabel(r.provider)}</dd>
                          <dt className="text-muted-foreground">Paket</dt>
                          <dd>{r.plan}</dd>
                          <dt className="text-muted-foreground">Jumlah</dt>
                          <dd className="font-medium">{formatCurrencyIdr(r.amount)}</dd>
                          <dt className="text-muted-foreground">Status</dt>
                          <dd>{statusLabel}</dd>
                          <dt className="text-muted-foreground">Tanggal dibuat</dt>
                          <dd>
                            {format(r.createdAt, "d MMM yyyy HH:mm", {
                              locale: localeId,
                            })}
                          </dd>
                          <dt className="text-muted-foreground">Dibayar</dt>
                          <dd>
                            {r.paidAt
                              ? format(r.paidAt, "d MMM yyyy HH:mm", {
                                  locale: localeId,
                                })
                              : "—"}
                          </dd>
                          <dt className="text-muted-foreground">Masa aktif sampai</dt>
                          <dd>{masaAktif}</dd>
                          {r.externalId && r.externalId !== r.id ? (
                            <>
                              <dt className="text-muted-foreground">Referensi eksternal</dt>
                              <dd className="break-all font-mono text-xs sm:text-sm">
                                {r.externalId}
                              </dd>
                            </>
                          ) : null}
                        </dl>
                      </details>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <p className="text-sm font-semibold">
                        {formatCurrencyIdr(r.amount)}
                      </p>
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
