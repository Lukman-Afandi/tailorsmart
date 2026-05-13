import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/role-guard";
import { Permission } from "@/lib/permissions";
import { auth } from "@/auth";
import { formatCurrencyIdr } from "@/lib/utils";
import { BillingTransactionStatus } from "@/lib/billing/billing-transaction-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi. Mulai upgrade dari halaman billing.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(r.createdAt, "d MMM yyyy, HH:mm", {
                          locale: localeId,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyIdr(r.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status)}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.paidAt
                          ? format(r.paidAt, "d MMM yyyy, HH:mm", {
                              locale: localeId,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
