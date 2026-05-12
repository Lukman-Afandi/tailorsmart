"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { SubscriptionPlan, TenantSubscriptionStatus } from "@prisma/client";
import {
  suspendTenantAction,
  unsuspendTenantAction,
} from "@/actions/platform-admin-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  subscriptionStatus: TenantSubscriptionStatus;
  suspendedAt: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  _count: { users: number; customers: number; orders: number };
};

export function TenantAdminTable({ tenants }: { tenants: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(id: string, mode: "suspend" | "unsuspend") {
    startTransition(async () => {
      try {
        if (mode === "suspend") await suspendTenantAction(id);
        else await unsuspendTenantAction(id);
        toast({ title: mode === "suspend" ? "Tenant ditangguhkan" : "Tenant aktif lagi" });
        router.refresh();
      } catch {
        toast({
          variant: "destructive",
          title: "Gagal",
          description: "Pastikan sesi super admin masih valid.",
        });
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="text-zinc-300">Bisnis</TableHead>
            <TableHead className="text-zinc-300">Paket</TableHead>
            <TableHead className="text-zinc-300">Status</TableHead>
            <TableHead className="text-right text-zinc-300">Pengguna</TableHead>
            <TableHead className="text-right text-zinc-300">Order</TableHead>
            <TableHead className="w-[120px] text-right text-zinc-300">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id} className="border-zinc-800">
              <TableCell>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-zinc-500">{t.slug}</div>
              </TableCell>
              <TableCell className="text-sm">{t.plan}</TableCell>
              <TableCell className="text-sm">
                {t.suspendedAt ? "Suspended" : t.subscriptionStatus}
              </TableCell>
              <TableCell className="text-right text-sm">{t._count.users}</TableCell>
              <TableCell className="text-right text-sm">{t._count.orders}</TableCell>
              <TableCell className="text-right">
                {t.suspendedAt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-600"
                    disabled={pending}
                    onClick={() => run(t.id, "unsuspend")}
                  >
                    Aktifkan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => run(t.id, "suspend")}
                  >
                    Suspend
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
