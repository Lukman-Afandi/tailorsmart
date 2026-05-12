"use client";

import { useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { SubscriptionPlan } from "@prisma/client";
import {
  OrderPriority,
  OrderStatus,
  PaymentStatus,
  StitchCategory,
  StitchProgress,
} from "@prisma/client";
import { createOrderAction } from "@/actions/order-actions";
import {
  orderFormSchema,
  type OrderFormValues,
} from "@/lib/validations/order";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ORDER_PRIORITY_LABEL,
  PAYMENT_STATUS_LABEL,
  STITCH_CATEGORY_LABEL,
  STITCH_PROGRESS_LABEL,
} from "@/lib/enterprise-labels";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { balanceDue, invoiceGrandTotal } from "@/lib/order-payment";
import { formatCurrencyIdr } from "@/lib/utils";

export function OrderFormDialog({
  open,
  onOpenChange,
  businessPlan,
  customers,
  staffMembers = [],
  defaultCustomerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessPlan: SubscriptionPlan;
  customers: { id: string; name: string; phone: string }[];
  staffMembers?: { id: string; name: string | null; email: string }[];
  defaultCustomerId?: string;
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: customers[0]?.id ?? "",
      title: "",
      description: "",
      amount: 0,
      status: OrderStatus.PENDING,
      category: StitchCategory.CUSTOM,
      stitchProgress: StitchProgress.RECEIVED,
      priority: OrderPriority.NORMAL,
      paymentStatus: PaymentStatus.BELUM_BAYAR,
      dpAmount: 0,
      amountPaid: 0,
      stitchDeadlineAt: undefined,
      tailorNotes: "",
      assignedUserId: "__pool__",
    },
  });

  const [watchAmount, watchDp, watchPaid] = useWatch({
    control: form.control,
    name: ["amount", "dpAmount", "amountPaid"],
  });
  const totalTagihan = invoiceGrandTotal(Number(watchAmount) || 0, 0).total;
  const sisaTagihan = balanceDue(totalTagihan, Number(watchPaid) || 0);

  useEffect(() => {
    if (!open) return;
    const preferred =
      defaultCustomerId &&
      customers.some((c) => c.id === defaultCustomerId)
        ? defaultCustomerId
        : customers[0]?.id ?? "";
    form.setValue("customerId", preferred);
  }, [open, defaultCustomerId, customers, form]);

  function onSubmit(values: OrderFormValues) {
    startTransition(async () => {
      const res = await createOrderAction(values);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Gagal membuat order",
          description: res.error,
        });
        return;
      }
      toast({ title: "Order dibuat" });
      onOpenChange(false);
      const preferred =
        defaultCustomerId &&
        customers.some((c) => c.id === defaultCustomerId)
          ? defaultCustomerId
          : customers[0]?.id ?? "";
      form.reset({
        customerId: preferred,
        title: "",
        description: "",
        amount: 0,
        status: OrderStatus.PENDING,
        category: StitchCategory.CUSTOM,
        stitchProgress: StitchProgress.RECEIVED,
        priority: OrderPriority.NORMAL,
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        dpAmount: 0,
        amountPaid: 0,
        stitchDeadlineAt: undefined,
        tailorNotes: "",
        assignedUserId: "__pool__",
      });
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order baru</DialogTitle>
          <DialogDescription>
            Paket {businessPlan}: limit order/bulan berlaku untuk FREE.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pelanggan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih pelanggan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {staffMembers.length > 0 ? (
              <FormField
                control={form.control}
                name="assignedUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penanggung jawab (opsional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "__pool__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pool / belum ditugaskan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__pool__">Belum ditugaskan</SelectItem>
                        {staffMembers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name ?? u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(STITCH_CATEGORY_LABEL) as StitchCategory[]).map(
                          (k) => (
                            <SelectItem key={k} value={k}>
                              {STITCH_CATEGORY_LABEL[k]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioritas</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(ORDER_PRIORITY_LABEL) as OrderPriority[]).map(
                          (k) => (
                            <SelectItem key={k} value={k}>
                              {ORDER_PRIORITY_LABEL[k]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pembayaran</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map(
                          (k) => (
                            <SelectItem key={k} value={k}>
                              {PAYMENT_STATUS_LABEL[k]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stitchProgress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress awal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(STITCH_PROGRESS_LABEL) as StitchProgress[]).map(
                          (k) => (
                            <SelectItem key={k} value={k}>
                              {STITCH_PROGRESS_LABEL[k]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total tagihan (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dpAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uang muka / DP (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total dibayar (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stitchDeadlineAt"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Deadline (opsional)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v ? new Date(v) : undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tailorNotes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Catatan penjahit</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          [
                            OrderStatus.PENDING,
                            OrderStatus.IN_PROGRESS,
                            OrderStatus.COMPLETED,
                            OrderStatus.PICKED_UP,
                          ] as const
                        ).map((s) => (
                          <SelectItem key={s} value={s}>
                            {ORDER_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="mb-2 font-medium">Ringkasan pembayaran</p>
              <dl className="grid gap-1 sm:grid-cols-2">
                <div className="flex justify-between gap-2 sm:col-span-1">
                  <dt className="text-muted-foreground">Total tagihan</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrencyIdr(totalTagihan)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:col-span-1">
                  <dt className="text-muted-foreground">Uang muka (DP)</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrencyIdr(Number(watchDp) || 0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:col-span-2 border-t border-border/60 pt-2">
                  <dt className="text-muted-foreground">Sisa harus dibayar</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {formatCurrencyIdr(sisaTagihan)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Sisa = total tagihan − total dibayar. Pajak faktur (jika ada) dihitung
                setelah faktur dibuat di detail order.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={pending || customers.length === 0}>
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
