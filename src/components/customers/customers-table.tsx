"use client";

import Link from "next/link";
import { useOptimistic, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { deleteCustomerAction } from "@/actions/customer-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { CustomerRow } from "@/components/customers/customers-section";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";

export function CustomersTable({
  initialRows,
  initialQuery,
  initialPage,
  pageSize,
  total,
  totalPages,
  remindersEnabled,
}: {
  initialRows: CustomerRow[];
  initialQuery: string;
  initialPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  remindersEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticRows, addOptimistic] = useOptimistic(
    initialRows,
    (state, deletedId: string) => state.filter((r) => r.id !== deletedId),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerRow | null>(null);

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (initialQuery) p.set("q", initialQuery);
    p.set("page", String(page));
    return `/dashboard/customers?${p.toString()}`;
  }

  function onDelete(row: CustomerRow) {
    startTransition(async () => {
      addOptimistic(row.id);
      const res = await deleteCustomerAction(row.id);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Gagal menghapus",
          description: res.error,
        });
        router.refresh();
        return;
      }
      toast({ title: "Pelanggan dihapus" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Menampilkan{" "}
          <span className="font-medium text-foreground">
            {total === 0 ? 0 : (initialPage - 1) * pageSize + 1}–
            {Math.min(initialPage * pageSize, total)}
          </span>{" "}
          dari <span className="font-medium text-foreground">{total}</span>
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden sm:table-cell">HP</TableHead>
              <TableHead className="hidden md:table-cell">Alamat</TableHead>
              <TableHead className="hidden lg:table-cell">Terdaftar</TableHead>
              <TableHead className="w-[52px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm">
                  Tidak ada pelanggan untuk filter ini.
                </TableCell>
              </TableRow>
            ) : (
              optimisticRows.map((row) => (
                <TableRow key={row.id} data-state={pending ? "pending" : undefined}>
                  <TableCell className="font-medium">
                    <Link
                      className="hover:underline"
                      href={`/dashboard/customers/${row.id}`}
                    >
                      {row.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground sm:hidden">
                      {row.phone}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{row.phone}</TableCell>
                  <TableCell className="hidden max-w-[320px] truncate md:table-cell">
                    {row.address ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {format(row.createdAt, "d MMM yyyy", { locale: id })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Aksi">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/customers/${row.id}`}>
                            Detail
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditTarget(row)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Halaman {initialPage} / {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild disabled={initialPage <= 1}>
            <Link href={buildHref(Math.max(1, initialPage - 1))}>Sebelumnya</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={initialPage >= totalPages}
          >
            <Link href={buildHref(Math.min(totalPages, initialPage + 1))}>
              Berikutnya
            </Link>
          </Button>
        </div>
      </div>

      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        remindersEnabled={remindersEnabled}
        onSaved={() => router.refresh()}
      />

      <CustomerFormDialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        mode="edit"
        customerId={editTarget?.id}
        remindersEnabled={remindersEnabled}
        onSaved={() => {
          setEditTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
