"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderStatus, SubscriptionPlan, UserRole } from "@prisma/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Plus } from "lucide-react";
import { formatCurrencyIdr } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { useOrdersUiStore } from "@/stores/orders-ui-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrdersRealtimeSearch } from "@/components/orders/orders-realtime-search";
import { canExportData, canManageOrders } from "@/lib/rbac";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { deleteOrderAction, updateOrderStatusAction } from "@/actions/order-actions";
import { toast } from "@/hooks/use-toast";
import type { OrderListRow } from "@/lib/serialize-order";

export function OrdersSection({
  userRole,
  businessPlan,
  initialOrders,
  customers,
  staffMembers = [],
}: {
  userRole: UserRole;
  businessPlan: SubscriptionPlan;
  initialOrders: OrderListRow[];
  customers: { id: string; name: string; phone: string }[];
  staffMembers?: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const statusFilter = useOrdersUiStore((s) => s.statusFilter);
  const setStatusFilter = useOrdersUiStore((s) => s.setStatusFilter);

  const [createOpen, setCreateOpen] = useState(false);
  const exportOk = canExportData(userRole);
  const manageOrders = canManageOrders(userRole);

  const rows = useMemo(() => {
    if (statusFilter === "ALL") return initialOrders;
    return initialOrders.filter((o) => o.status === statusFilter);
  }, [initialOrders, statusFilter]);

  async function onStatusChange(id: string, status: OrderStatus) {
    const res = await updateOrderStatusAction(id, status);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Gagal mengubah status",
        description: res.error,
      });
      return;
    }
    toast({ title: "Status diperbarui" });
    router.refresh();
  }

  async function onDelete(id: string) {
    const res = await deleteOrderAction(id);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: res.error,
      });
      return;
    }
    toast({ title: "Order dihapus" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order</h2>
          <p className="text-muted-foreground">
            Filter status disimpan di Zustand (UI state) — data tetap ter-scope tenant.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <OrdersRealtimeSearch />
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as typeof statusFilter)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">Diproses</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="PICKED_UP">Diambil</SelectItem>
            </SelectContent>
          </Select>
          {exportOk ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/api/export/orders/excel">Excel</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/export/orders/csv">CSV</a>
              </Button>
            </div>
          ) : null}
          {manageOrders ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Order baru
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead className="hidden md:table-cell">Pelanggan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Nominal</TableHead>
              <TableHead className="hidden lg:table-cell">Tanggal</TableHead>
              <TableHead className="w-[52px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm">
                  Tidak ada order untuk filter ini.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    <div>
                      <Link
                        className="hover:underline"
                        href={`/dashboard/orders/${o.id}`}
                      >
                        {o.title}
                      </Link>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground md:hidden">
                      {o.customer.name}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      className="hover:underline"
                      href={`/dashboard/customers/${o.customer.id}`}
                    >
                      {o.customer.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {o.customer.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    {manageOrders ? (
                      <Select
                        value={o.status}
                        onValueChange={(v) =>
                          onStatusChange(o.id, v as OrderStatus)
                        }
                      >
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            [
                              "PENDING",
                              "IN_PROGRESS",
                              "COMPLETED",
                              "PICKED_UP",
                            ] as const
                          ).map((s) => (
                            <SelectItem key={s} value={s}>
                              {ORDER_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatCurrencyIdr(Number(o.amount))}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {format(o.createdAt, "d MMM yyyy HH:mm", { locale: id })}
                  </TableCell>
                  <TableCell className="text-right">
                    {manageOrders ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Aksi">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(o.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OrderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        businessPlan={businessPlan}
        customers={customers}
        staffMembers={staffMembers}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
