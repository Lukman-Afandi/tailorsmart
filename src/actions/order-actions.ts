"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { analyticsTag } from "@/lib/cache-tags";
import { computeEstimatedCompletion } from "@/lib/order-estimate";
import {
  canDeleteOrder,
  canManageInvoices,
  canManageOrders,
  canUpdateStitchProgress,
} from "@/lib/rbac";
import { canCreateOrderThisMonth, PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { effectivePlanForLimits } from "@/lib/subscription-state";
import { requireSessionBusinessId } from "@/lib/tenant";
import { countOrdersInCurrentMonth } from "@/lib/usage";
import { invoiceGrandTotal } from "@/lib/order-payment";
import {
  invoiceCreateSchema,
  orderFormSchema,
  orderRevisionSchema,
  type OrderFormValues,
} from "@/lib/validations/order";
import type { Order, OrderStatus, Prisma } from "@prisma/client";
import {
  OrderPriority,
  PaymentStatus,
  StitchCategory,
  StitchProgress,
} from "@prisma/client";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function upsertOrderHistorySnapshot(
  tx: Prisma.TransactionClient,
  order: Order,
) {
  await tx.customerOrderHistory.upsert({
    where: { orderId: order.id },
    create: {
      businessId: order.businessId,
      customerId: order.customerId,
      orderId: order.id,
      title: order.title,
      description: order.description,
      status: order.status,
      amount: order.amount,
      category: order.category,
      stitchProgress: order.stitchProgress,
      paymentStatus: order.paymentStatus,
      dpAmount: order.dpAmount,
      amountPaid: order.amountPaid,
      stitchDeadlineAt: order.stitchDeadlineAt,
      estimatedCompletionAt: order.estimatedCompletionAt,
      orderCreatedAt: order.createdAt,
      orderUpdatedAt: order.updatedAt,
    },
    update: {
      customerId: order.customerId,
      title: order.title,
      description: order.description,
      status: order.status,
      amount: order.amount,
      category: order.category,
      stitchProgress: order.stitchProgress,
      paymentStatus: order.paymentStatus,
      dpAmount: order.dpAmount,
      amountPaid: order.amountPaid,
      stitchDeadlineAt: order.stitchDeadlineAt,
      estimatedCompletionAt: order.estimatedCompletionAt,
      orderCreatedAt: order.createdAt,
      orderUpdatedAt: order.updatedAt,
    },
  });
}

function bumpAnalytics(businessId: string) {
  revalidateTag(analyticsTag(businessId));
}

export async function createOrderAction(
  input: OrderFormValues,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.role || !canManageOrders(session.user.role)) {
    return {
      ok: false,
      error: "Anda tidak memiliki izin untuk membuat order.",
    };
  }

  const businessId = await requireSessionBusinessId();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const limitsPlan = effectivePlanForLimits(business);
  const ordersThisMonth = await countOrdersInCurrentMonth(businessId);
  if (!canCreateOrderThisMonth(limitsPlan, ordersThisMonth)) {
    const max = PLAN_LIMITS[limitsPlan].maxOrdersPerMonth;
    return {
      ok: false,
      error: `Paket FREE membatasi ${max} order per bulan. Upgrade untuk lebih banyak order.`,
    };
  }

  const parsed = orderFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Validasi order gagal" };
  }

  const dpAmount = parsed.data.dpAmount ?? 0;
  const amountPaid = parsed.data.amountPaid ?? 0;
  if (amountPaid > parsed.data.amount) {
    return {
      ok: false,
      error: "Total dibayar tidak boleh melebihi total tagihan order.",
    };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, businessId },
  });
  if (!customer) {
    return { ok: false, error: "Pelanggan tidak valid" };
  }

  const defaultBranch = await prisma.branch.findFirst({
    where: { businessId, isDefault: true },
    select: { id: true },
  });
  const branchId = customer.branchId ?? defaultBranch?.id ?? null;

  const category = parsed.data.category ?? StitchCategory.CUSTOM;
  const stitchProgress =
    parsed.data.stitchProgress ?? StitchProgress.RECEIVED;
  const priority = parsed.data.priority ?? OrderPriority.NORMAL;
  const paymentStatus =
    parsed.data.paymentStatus ?? PaymentStatus.BELUM_BAYAR;
  const stitchDeadlineAt = parsed.data.stitchDeadlineAt ?? null;
  const tailorNotes = parsed.data.tailorNotes ?? null;

  let assignedUserId: string | null = null;
  const rawAssign = parsed.data.assignedUserId;
  if (rawAssign && rawAssign !== "__pool__") {
    const assignee = await prisma.user.findFirst({
      where: { id: rawAssign, businessId },
      select: { id: true },
    });
    if (!assignee) {
      return { ok: false, error: "Penanggung jawab produksi tidak valid." };
    }
    assignedUserId = assignee.id;
  }

  const estimatedCompletionAt = computeEstimatedCompletion(
    new Date(),
    category,
    business.defaultLeadDays,
  );

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        businessId,
        branchId,
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: parsed.data.status,
        amount: parsed.data.amount,
        category,
        stitchProgress,
        priority,
        paymentStatus,
        dpAmount,
        amountPaid,
        stitchDeadlineAt,
        estimatedCompletionAt,
        tailorNotes,
        assignedUserId,
      },
    });
    await upsertOrderHistorySnapshot(tx, created);
    return created;
  });

  bumpAnalytics(businessId);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/production-calendar");
  revalidatePath(`/dashboard/customers/${parsed.data.customerId}`);
  return { ok: true, data: { id: order.id } };
}

export async function updateOrderAction(
  id: string,
  input: OrderFormValues,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.role || !canManageOrders(session.user.role)) {
    return {
      ok: false,
      error: "Anda tidak memiliki izin mengubah order.",
    };
  }

  const businessId = await requireSessionBusinessId();

  const existing = await prisma.order.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    return { ok: false, error: "Order tidak ditemukan" };
  }

  const parsed = orderFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Validasi order gagal" };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, businessId },
  });
  if (!customer) {
    return { ok: false, error: "Pelanggan tidak valid" };
  }

  const invoiceRow = await prisma.invoice.findUnique({
    where: { orderId: id },
    select: { taxPercent: true },
  });
  const taxPct = invoiceRow ? Number(invoiceRow.taxPercent) : 0;
  const maxPayable = invoiceGrandTotal(parsed.data.amount, taxPct).total;
  const amountPaid = parsed.data.amountPaid ?? Number(existing.amountPaid);
  if (amountPaid > maxPayable) {
    return {
      ok: false,
      error:
        taxPct > 0
          ? "Total dibayar melebihi tagihan termasuk pajak faktur. Sesuaikan nominal atau pajak."
          : "Total dibayar tidak boleh melebihi total tagihan order.",
    };
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const category = parsed.data.category ?? existing.category;
  const stitchProgress =
    parsed.data.stitchProgress ?? existing.stitchProgress;
  const priority = parsed.data.priority ?? existing.priority;
  const paymentStatus =
    parsed.data.paymentStatus ?? existing.paymentStatus;
  const dpAmount = parsed.data.dpAmount ?? Number(existing.dpAmount);
  const stitchDeadlineAt =
    parsed.data.stitchDeadlineAt !== undefined
      ? parsed.data.stitchDeadlineAt
      : existing.stitchDeadlineAt;
  const tailorNotes =
    parsed.data.tailorNotes !== undefined
      ? parsed.data.tailorNotes
      : existing.tailorNotes;

  let assignedUserId = existing.assignedUserId;
  const rawAssign = parsed.data.assignedUserId;
  if (rawAssign !== undefined) {
    if (rawAssign === "__pool__" || rawAssign == null) {
      assignedUserId = null;
    } else {
      const assignee = await prisma.user.findFirst({
        where: { id: rawAssign, businessId },
        select: { id: true },
      });
      if (!assignee) {
        return { ok: false, error: "Penanggung jawab produksi tidak valid." };
      }
      assignedUserId = assignee.id;
    }
  }

  let estimatedCompletionAt = existing.estimatedCompletionAt;
  if (parsed.data.category && parsed.data.category !== existing.category) {
    estimatedCompletionAt = computeEstimatedCompletion(
      existing.createdAt,
      category,
      business.defaultLeadDays,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: parsed.data.status,
        amount: parsed.data.amount,
        category,
        stitchProgress,
        priority,
        paymentStatus,
        dpAmount,
        amountPaid,
        stitchDeadlineAt,
        estimatedCompletionAt,
        tailorNotes,
        assignedUserId,
      },
    });
    const updated = await tx.order.findUniqueOrThrow({ where: { id } });
    await upsertOrderHistorySnapshot(tx, updated);
  });

  bumpAnalytics(businessId);
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/production-calendar");
  revalidatePath(`/dashboard/customers/${parsed.data.customerId}`);
  revalidatePath(`/dashboard/customers/${existing.customerId}`);
  return { ok: true };
}

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.role || !canManageOrders(session.user.role)) {
    return { ok: false, error: "Anda tidak memiliki izin mengubah status order." };
  }

  const businessId = await requireSessionBusinessId();

  const existing = await prisma.order.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    return { ok: false, error: "Order tidak ditemukan" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status },
    });
    const updated = await tx.order.findUniqueOrThrow({ where: { id } });
    await upsertOrderHistorySnapshot(tx, updated);
  });

  bumpAnalytics(businessId);
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/customers/${existing.customerId}`);
  return { ok: true };
}

export async function updateStitchProgressAction(
  id: string,
  stitchProgress: StitchProgress,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.role || !canUpdateStitchProgress(session.user.role)) {
    return {
      ok: false,
      error: "Anda tidak memiliki izin memperbarui progres jahitan.",
    };
  }

  const businessId = await requireSessionBusinessId();
  const existing = await prisma.order.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    return { ok: false, error: "Order tidak ditemukan" };
  }

  if (session.user.role === "PEGAWAI") {
    const okPool =
      existing.assignedUserId === null ||
      existing.assignedUserId === session.user.id;
    if (!okPool) {
      return { ok: false, error: "Order ini tidak ditugaskan kepada Anda." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { stitchProgress },
    });
    const updated = await tx.order.findUniqueOrThrow({ where: { id } });
    await upsertOrderHistorySnapshot(tx, updated);
  });

  bumpAnalytics(businessId);
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard/orders");
  return { ok: true };
}

export async function deleteOrderAction(id: string): Promise<ActionResult> {
  const session = await auth();
  const businessId = await requireSessionBusinessId();
  if (!session?.user?.role || !canDeleteOrder(session.user.role)) {
    return { ok: false, error: "Hanya pemilik atau admin yang dapat menghapus order." };
  }

  const existing = await prisma.order.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    return { ok: false, error: "Order tidak ditemukan" };
  }

  await prisma.order.delete({ where: { id } });
  bumpAnalytics(businessId);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/customers/${existing.customerId}`);
  await writeAuditLog({
    businessId,
    userId: session.user.id,
    action: "ORDER_DELETE",
    resource: "Order",
    resourceId: id,
  });
  return { ok: true };
}

export async function addOrderRevisionAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  const businessId = await requireSessionBusinessId();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Sesi tidak valid" };
  if (!session.user.role || !canManageOrders(session.user.role)) {
    return { ok: false, error: "Anda tidak memiliki izin menambah revisi." };
  }

  const parsed = orderRevisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Validasi revisi gagal" };
  }

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, businessId },
  });
  if (!order) {
    return { ok: false, error: "Order tidak ditemukan" };
  }

  await prisma.orderRevision.create({
    data: {
      orderId: order.id,
      userId,
      note: parsed.data.note,
    },
  });

  await writeAuditLog({
    businessId,
    userId,
    action: "ORDER_REVISION",
    resource: "Order",
    resourceId: order.id,
    metadata: { preview: parsed.data.note.slice(0, 200) },
  });

  revalidatePath(`/dashboard/orders/${order.id}`);
  return { ok: true };
}

export async function createInvoiceForOrderAction(
  input: unknown,
): Promise<ActionResult<{ number: string }>> {
  const session = await auth();
  const businessId = await requireSessionBusinessId();
  const role = session?.user?.role;
  if (!role || !canManageInvoices(role)) {
    return { ok: false, error: "Tidak diizinkan membuat faktur." };
  }

  const parsed = invoiceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Data faktur tidak valid" };
  }

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, businessId },
    include: { invoice: true },
  });
  if (!order) {
    return { ok: false, error: "Order tidak ditemukan" };
  }
  if (order.invoice) {
    return { ok: true, data: { number: order.invoice.number } };
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const b = await tx.business.update({
      where: { id: businessId },
      data: { invoiceSequence: { increment: 1 } },
      select: { invoiceSequence: true },
    });
    const year = new Date().getFullYear();
    const number = `INV-${year}-${String(b.invoiceSequence).padStart(5, "0")}`;
    return tx.invoice.create({
      data: {
        businessId,
        orderId: order.id,
        number,
        taxPercent: parsed.data.taxPercent,
        notes: parsed.data.notes ?? null,
      },
    });
  });

  await writeAuditLog({
    businessId,
    userId: session.user.id,
    action: "INVOICE_CREATE",
    resource: "Invoice",
    resourceId: invoice.id,
    metadata: { number: invoice.number, orderId: order.id },
  });

  revalidatePath(`/dashboard/orders/${order.id}`);
  return { ok: true, data: { number: invoice.number } };
}

export async function markOrderCompletionNotifiedAction(
  orderId: string,
): Promise<ActionResult> {
  const session = await auth();
  const businessId = await requireSessionBusinessId();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Sesi tidak valid" };
  if (!session.user.role || !canManageOrders(session.user.role)) {
    return { ok: false, error: "Tindakan tidak diizinkan." };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
  });
  if (!order) {
    return { ok: false, error: "Order tidak ditemukan" };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { completionNotifiedAt: new Date() },
  });

  await writeAuditLog({
    businessId,
    userId,
    action: "WHATSAPP_COMPLETION",
    resource: "Order",
    resourceId: orderId,
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  return { ok: true };
}
