"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { isPast } from "date-fns";
import {
  OrderAttachmentType,
  OrderPriority,
  OrderStatus,
  PaymentStatus,
  StitchCategory,
  StitchProgress,
  SubscriptionPlan,
  type UserRole,
} from "@prisma/client";
import { useForm } from "react-hook-form";
import {
  addOrderRevisionAction,
  createInvoiceForOrderAction,
  deleteOrderAction,
  markOrderCompletionNotifiedAction,
  updateOrderAction,
  updateStitchProgressAction,
} from "@/actions/order-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_PRIORITY_LABEL,
  PAYMENT_STATUS_LABEL,
  STITCH_CATEGORY_LABEL,
  STITCH_PROGRESS_LABEL,
} from "@/lib/enterprise-labels";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  canDeleteOrder,
  canManageCustomers,
  canManageInvoices,
  canManageOrders,
  canUpdateStitchProgress,
} from "@/lib/rbac";
import { orderFormSchema, type OrderFormValues } from "@/lib/validations/order";
import { balanceDue, invoiceGrandTotal } from "@/lib/order-payment";
import { formatCurrencyIdr } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileImage,
  MessageCircle,
  Printer,
  Trash2,
} from "lucide-react";

type InitialOrder = {
  id: string;
  title: string;
  description: string | null;
  status: OrderStatus;
  category: StitchCategory;
  stitchProgress: StitchProgress;
  priority: OrderPriority;
  paymentStatus: PaymentStatus;
  dpAmount: number;
  amountPaid: number;
  amount: number;
  stitchDeadlineAt: string | null;
  estimatedCompletionAt: string | null;
  tailorNotes: string | null;
  completionNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string };
  business: {
    name: string;
    phone: string | null;
    address: string | null;
    plan: SubscriptionPlan;
  };
  attachments: {
    id: string;
    type: OrderAttachmentType;
    url: string;
    createdAt: string;
  }[];
  revisions: {
    id: string;
    note: string;
    createdAt: string;
    user: { name: string | null; email: string } | null;
  }[];
  invoice: {
    id: string;
    number: string;
    taxPercent: number;
    issuedAt: string;
    notes: string | null;
  } | null;
  assignedUserId: string | null;
};

export function OrderDetailClient({
  role,
  businessPlan,
  initial,
  staffMembers = [],
}: {
  role: UserRole;
  businessPlan: SubscriptionPlan;
  initial: InitialOrder;
  staffMembers?: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revision, setRevision] = useState("");
  const [uploading, setUploading] = useState<OrderAttachmentType | null>(null);

  const manageOrder = canManageOrders(role);
  const manageInvoice = canManageInvoices(role);
  const canProgress = canUpdateStitchProgress(role);
  const manageCustomers = canManageCustomers(role);

  const overdue = useMemo(() => {
    if (!initial.stitchDeadlineAt) return false;
    if (
      initial.status === OrderStatus.COMPLETED ||
      initial.status === OrderStatus.PICKED_UP
    ) {
      return false;
    }
    return isPast(new Date(initial.stitchDeadlineAt));
  }, [initial.stitchDeadlineAt, initial.status]);

  const invoiceBreakdown = useMemo(() => {
    const subtotal = initial.amount;
    const taxPct = initial.invoice?.taxPercent ?? 0;
    const { tax, total } = invoiceGrandTotal(subtotal, taxPct);
    return {
      subtotal,
      taxPct,
      tax,
      grandTotal: total,
      balance: balanceDue(total, initial.amountPaid),
    };
  }, [initial.amount, initial.amountPaid, initial.invoice?.taxPercent]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: initial.customer.id,
      title: initial.title,
      description: initial.description ?? "",
      amount: initial.amount,
      status: initial.status,
      category: initial.category,
      stitchProgress: initial.stitchProgress,
      priority: initial.priority,
      paymentStatus: initial.paymentStatus,
      dpAmount: initial.dpAmount,
      amountPaid: initial.amountPaid,
      stitchDeadlineAt: initial.stitchDeadlineAt
        ? new Date(initial.stitchDeadlineAt)
        : null,
      tailorNotes: initial.tailorNotes ?? "",
      assignedUserId: initial.assignedUserId ?? "__pool__",
    },
  });

  const [wAmount, wDp, wPaid, wPaymentStatus] = form.watch([
    "amount",
    "dpAmount",
    "amountPaid",
    "paymentStatus",
  ]);
  const previewTaxPct = initial.invoice?.taxPercent ?? 0;
  const previewGrandTotal = invoiceGrandTotal(
    Number(wAmount) || 0,
    previewTaxPct,
  ).total;
  const previewSisa = balanceDue(previewGrandTotal, Number(wPaid) || 0);

  function onSave(values: OrderFormValues) {
    startTransition(async () => {
      const res = await updateOrderAction(initial.id, values);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Gagal menyimpan",
          description: res.error,
        });
        return;
      }
      toast({ title: "Order diperbarui" });
      router.refresh();
    });
  }

  function onProgressChange(v: StitchProgress) {
    startTransition(async () => {
      const res = await updateStitchProgressAction(initial.id, v);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Gagal",
          description: res.error,
        });
        return;
      }
      form.setValue("stitchProgress", v);
      toast({ title: "Progress diperbarui" });
      router.refresh();
    });
  }

  async function onCreateInvoice() {
    startTransition(async () => {
      const res = await createInvoiceForOrderAction({
        orderId: initial.id,
        taxPercent: 0,
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Faktur gagal",
          description: res.error,
        });
        return;
      }
      toast({ title: "Faktur dibuat", description: res.data?.number });
      router.refresh();
    });
  }

  async function onWhatsAppComplete() {
    const res = await fetch(
      `/api/whatsapp/order?orderId=${encodeURIComponent(initial.id)}&kind=complete`,
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast({
        variant: "destructive",
        title: "WhatsApp gagal",
        description: (j as { error?: string }).error ?? "Coba lagi",
      });
      return;
    }
    const data = (await res.json()) as { url: string };
    window.open(data.url, "_blank", "noopener,noreferrer");
    await markOrderCompletionNotifiedAction(initial.id);
    toast({ title: "Notifikasi dicatat" });
    router.refresh();
  }

  async function onUpload(type: OrderAttachmentType, file: File | null) {
    if (!file) return;
    setUploading(type);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("orderId", initial.id);
      fd.set("type", type);
      const res = await fetch("/api/upload/order", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Upload gagal",
          description: (j as { error?: string }).error ?? "Coba lagi",
        });
        return;
      }
      toast({ title: "Foto tersimpan" });
      router.refresh();
    } finally {
      setUploading(null);
    }
  }

  function onAddRevision() {
    const note = revision.trim();
    if (note.length < 2) return;
    startTransition(async () => {
      const res = await addOrderRevisionAction({
        orderId: initial.id,
        note,
      });
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Revisi gagal",
          description: res.error,
        });
        return;
      }
      setRevision("");
      toast({ title: "Revisi ditambahkan" });
      router.refresh();
    });
  }

  function onDelete() {
    if (!confirm("Hapus order ini? Riwayat pelanggan tetap tersimpan.")) return;
    startTransition(async () => {
      const res = await deleteOrderAction(initial.id);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Gagal menghapus",
          description: res.error,
        });
        return;
      }
      toast({ title: "Order dihapus" });
      router.replace("/dashboard/orders");
      router.refresh();
    });
  }

  const canPdf = PLAN_LIMITS[businessPlan].exportPdf;
  const attachmentLabel: Record<OrderAttachmentType, string> = {
    FABRIC: "Foto kain",
    FINISHED: "Foto hasil jadi",
    DESIGN_REF: "Desain referensi",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke order
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{initial.title}</h2>
            <Badge variant="secondary">
              {STITCH_CATEGORY_LABEL[initial.category]}
            </Badge>
            <Badge variant="outline">
              {ORDER_PRIORITY_LABEL[initial.priority]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {manageCustomers ? (
              <Link
                href={`/dashboard/customers/${initial.customer.id}`}
                className="hover:underline"
              >
                {initial.customer.name}
              </Link>
            ) : (
              initial.customer.name
            )}{" "}
            · {initial.customer.phone}
          </p>
          {overdue ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Deadline jahitan lewat — segera tindak lanjut.
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {manageOrder ? (
            <Button variant="outline" onClick={onWhatsAppComplete}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WA selesai
            </Button>
          ) : null}
          {canDeleteOrder(role) ? (
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="media">Foto & desain</TabsTrigger>
          <TabsTrigger value="revisions">Revisi</TabsTrigger>
          {manageInvoice ? (
            <TabsTrigger value="invoice">Faktur</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="summary">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Detail order</CardTitle>
              <CardDescription>
                Estimasi selesai:{" "}
                {initial.estimatedCompletionAt
                  ? new Date(initial.estimatedCompletionAt).toLocaleString("id-ID")
                  : "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSave)}
                  className="grid gap-4 lg:grid-cols-2"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel>Judul</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!manageOrder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel>Deskripsi</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} disabled={!manageOrder} />
                        </FormControl>
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
                          <Input
                            type="number"
                            min={0}
                            step="1000"
                            {...field}
                            disabled={!manageOrder}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status order</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!manageOrder}
                        >
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
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori jahitan</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!manageOrder}
                        >
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!manageOrder}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(
                              Object.keys(ORDER_PRIORITY_LABEL) as OrderPriority[]
                            ).map((k) => (
                              <SelectItem key={k} value={k}>
                                {ORDER_PRIORITY_LABEL[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stitchDeadlineAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline jahitan</FormLabel>
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
                              field.onChange(v ? new Date(v) : null);
                            }}
                            disabled={!manageOrder}
                          />
                        </FormControl>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!manageOrder}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(
                              Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]
                            ).map((k) => (
                              <SelectItem key={k} value={k}>
                                {PAYMENT_STATUS_LABEL[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Input
                            type="number"
                            min={0}
                            step="1000"
                            {...field}
                            disabled={!manageOrder}
                          />
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
                          <Input
                            type="number"
                            min={0}
                            step="1000"
                            {...field}
                            disabled={!manageOrder}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-lg border bg-muted/40 p-4 lg:col-span-2">
                    <p className="mb-2 text-sm font-medium">Ringkasan pembayaran</p>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Total tagihan</dt>
                        <dd className="font-medium tabular-nums">
                          {formatCurrencyIdr(previewGrandTotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Uang muka (DP)</dt>
                        <dd className="font-medium tabular-nums">
                          {formatCurrencyIdr(Number(wDp) || 0)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 sm:col-span-2 border-t border-border/60 pt-2">
                        <dt className="text-muted-foreground">Sisa harus dibayar</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatCurrencyIdr(previewSisa)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 sm:col-span-2 text-muted-foreground">
                        <dt>Status pembayaran</dt>
                        <dd className="font-medium text-foreground">
                          {PAYMENT_STATUS_LABEL[
                            wPaymentStatus ?? initial.paymentStatus
                          ]}
                        </dd>
                      </div>
                    </dl>
                    {previewTaxPct > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Total tagihan memakai pajak faktur {previewTaxPct}% dari nilai
                        order.
                      </p>
                    ) : null}
                  </div>
                  {manageOrder && staffMembers.length > 0 ? (
                    <FormField
                      control={form.control}
                      name="assignedUserId"
                      render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                          <FormLabel>Penanggung jawab produksi</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? "__pool__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pool" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__pool__">
                                Belum ditugaskan (pool)
                              </SelectItem>
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
                    name="tailorNotes"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel>Catatan penjahit</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            {...field}
                            value={field.value ?? ""}
                            disabled={!manageOrder}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {manageOrder ? (
                    <div className="flex items-end lg:col-span-2">
                      <Button type="submit" disabled={pending}>
                        {pending ? "Menyimpan…" : "Simpan perubahan"}
                      </Button>
                    </div>
                  ) : null}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Tracking progress jahitan</CardTitle>
              <CardDescription>
                Tahapan produksi — terpisah dari status order kasar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Tahap saat ini</p>
                <Select
                  value={form.watch("stitchProgress")}
                  onValueChange={(v) => onProgressChange(v as StitchProgress)}
                  disabled={pending || !canProgress}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
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
              </div>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Total tagihan</p>
                  <p className="text-lg font-semibold">
                    {formatCurrencyIdr(invoiceBreakdown.grandTotal)}
                  </p>
                  {invoiceBreakdown.tax > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dasar {formatCurrencyIdr(invoiceBreakdown.subtotal)} + pajak{" "}
                      {invoiceBreakdown.taxPct}% {formatCurrencyIdr(invoiceBreakdown.tax)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Belum ada pajak faktur
                    </p>
                  )}
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Uang muka (DP)</p>
                  <p className="text-lg font-semibold">
                    {formatCurrencyIdr(initial.dpAmount)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Total dibayar</p>
                  <p className="text-lg font-semibold">
                    {formatCurrencyIdr(initial.amountPaid)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Sisa tagihan</p>
                  <p className="text-lg font-semibold">
                    {formatCurrencyIdr(invoiceBreakdown.balance)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {PAYMENT_STATUS_LABEL[initial.paymentStatus]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Foto & referensi</CardTitle>
              <CardDescription>
                Unggah ke Cloudinary — aman per-tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(Object.keys(attachmentLabel) as OrderAttachmentType[]).map((t) => (
                <div key={t} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{attachmentLabel[t]}</p>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
                      <FileImage className="h-4 w-4" />
                      <span>{uploading === t ? "Mengunggah…" : "Pilih file"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={(e) =>
                          onUpload(t, e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {initial.attachments
                      .filter((a) => a.type === t)
                      .map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-lg border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.url}
                            alt=""
                            className="h-40 w-full object-cover transition group-hover:opacity-90"
                          />
                        </a>
                      ))}
                  </div>
                  {initial.attachments.filter((a) => a.type === t).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Belum ada unggahan.
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat revisi</CardTitle>
              <CardDescription>Catatan perubahan dari tim.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {manageOrder ? (
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    placeholder="Contoh: Ubah panjang lengan +2cm"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={onAddRevision}
                    disabled={pending || revision.trim().length < 2}
                  >
                    Tambah revisi
                  </Button>
                </div>
              ) : null}
              {manageOrder ? <Separator /> : null}
              {initial.revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada revisi.</p>
              ) : (
                <ScrollArea className="h-[320px] pr-3">
                  <ul className="space-y-3">
                    {initial.revisions.map((r) => (
                      <li key={r.id} className="rounded-lg border p-3">
                        <p className="text-sm">{r.note}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {(r.user?.name ?? r.user?.email ?? "Tim")} ·{" "}
                          {new Date(r.createdAt).toLocaleString("id-ID")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {manageInvoice ? (
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Faktur & cetak</CardTitle>
              <CardDescription>
                Generate nomor unik per tenant, PDF A4, dan lembar thermal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {initial.invoice ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    Nomor:{" "}
                    <span className="font-semibold">{initial.invoice.number}</span>
                  </p>
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                    <p className="mb-2 font-medium">Isi nota / faktur</p>
                    <dl className="space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Subtotal order</dt>
                        <dd className="tabular-nums">
                          {formatCurrencyIdr(invoiceBreakdown.subtotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">
                          Pajak ({invoiceBreakdown.taxPct}%)
                        </dt>
                        <dd className="tabular-nums">
                          {formatCurrencyIdr(invoiceBreakdown.tax)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-border/60 pt-2 font-medium">
                        <dt>Total tagihan</dt>
                        <dd className="tabular-nums">
                          {formatCurrencyIdr(invoiceBreakdown.grandTotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Uang muka (DP)</dt>
                        <dd className="tabular-nums">
                          {formatCurrencyIdr(initial.dpAmount)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Telah dibayar</dt>
                        <dd className="tabular-nums">
                          {formatCurrencyIdr(initial.amountPaid)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 font-semibold">
                        <dt>Sisa tagihan</dt>
                        <dd className="tabular-nums">
                          {formatCurrencyIdr(invoiceBreakdown.balance)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 pt-1 text-muted-foreground">
                        <dt>Status pembayaran</dt>
                        <dd className="font-medium text-foreground">
                          {PAYMENT_STATUS_LABEL[initial.paymentStatus]}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canPdf ? (
                      <Button variant="outline" asChild>
                        <a
                          href={`/api/orders/${initial.id}/invoice/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          PDF
                        </a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        PDF aktif mulai paket Basic.
                      </p>
                    )}
                    <Button variant="outline" asChild>
                      <a
                        href={`/api/orders/${initial.id}/invoice/thermal`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Thermal
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Belum ada faktur untuk order ini.
                  </p>
                  <Button onClick={onCreateInvoice} disabled={pending}>
                    Buat faktur
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
