"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canAddCustomer, PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { canManageCustomers } from "@/lib/rbac";
import { effectivePlanForLimits } from "@/lib/subscription-state";
import { requireSessionBusinessId } from "@/lib/tenant";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "@/lib/validations/customer";
import { normalizeBodyMeasurements } from "@/lib/body-measurements";
import type { Prisma } from "@prisma/client";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createCustomerAction(
  input: CustomerFormValues & { nextFollowUpAt?: string | null },
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.role || !canManageCustomers(session.user.role)) {
    return { ok: false, error: "Anda tidak memiliki izin menambah pelanggan." };
  }

  const businessId = await requireSessionBusinessId();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const limitsPlan = effectivePlanForLimits(business);
  const currentCount = await prisma.customer.count({ where: { businessId } });
  if (!canAddCustomer(limitsPlan, currentCount)) {
    const max = PLAN_LIMITS[limitsPlan].maxCustomers;
    return {
      ok: false,
      error: `Paket Anda membatasi maksimal ${max} pelanggan. Upgrade paket untuk menambah.`,
    };
  }

  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    return { ok: false, error: "Validasi gagal", fieldErrors };
  }

  const remindersAllowed = PLAN_LIMITS[limitsPlan].reminders;
  let nextFollowUpAt: Date | null = null;
  if (remindersAllowed && input.nextFollowUpAt) {
    const d = new Date(input.nextFollowUpAt);
    if (!Number.isNaN(d.getTime())) nextFollowUpAt = d;
  }

  const bodyMeasurements = parsed.data.bodyMeasurements as
    | Prisma.InputJsonValue
    | undefined;

  const defaultBranch = await prisma.branch.findFirst({
    where: { businessId, isDefault: true },
    select: { id: true },
  });

  const customer = await prisma.customer.create({
    data: {
      businessId,
      branchId: defaultBranch?.id ?? null,
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
      bodyMeasurements: bodyMeasurements ?? undefined,
      nextFollowUpAt,
    },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: customer.id } };
}

export async function updateCustomerAction(
  id: string,
  input: CustomerFormValues & { nextFollowUpAt?: string | null },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.role || !canManageCustomers(session.user.role)) {
    return { ok: false, error: "Anda tidak memiliki izin mengubah pelanggan." };
  }

  const businessId = await requireSessionBusinessId();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });
  const limitsPlan = effectivePlanForLimits(business);

  const existing = await prisma.customer.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    return { ok: false, error: "Pelanggan tidak ditemukan" };
  }

  const parsed = customerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Validasi gagal" };
  }

  const remindersAllowed = PLAN_LIMITS[limitsPlan].reminders;
  let nextFollowUpAt: Date | null = null;
  if (remindersAllowed && input.nextFollowUpAt) {
    const d = new Date(input.nextFollowUpAt);
    if (!Number.isNaN(d.getTime())) nextFollowUpAt = d;
  } else if (remindersAllowed) {
    nextFollowUpAt = null;
  }

  const bodyMeasurements = parsed.data.bodyMeasurements as
    | Prisma.InputJsonValue
    | undefined;

  await prisma.customer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
      bodyMeasurements: bodyMeasurements ?? undefined,
      ...(remindersAllowed ? { nextFollowUpAt } : {}),
    },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.role || !canManageCustomers(session.user.role)) {
    return { ok: false, error: "Anda tidak memiliki izin menghapus pelanggan." };
  }

  const businessId = await requireSessionBusinessId();

  const existing = await prisma.customer.findFirst({
    where: { id, businessId },
  });
  if (!existing) {
    return { ok: false, error: "Pelanggan tidak ditemukan" };
  }

  await prisma.customer.delete({ where: { id } });
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getCustomerForEditAction(id: string) {
  const session = await auth();
  if (!session?.user?.role || !canManageCustomers(session.user.role)) {
    return null;
  }

  const businessId = await requireSessionBusinessId();
  const c = await prisma.customer.findFirst({
    where: { id, businessId },
  });
  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address ?? "",
    notes: c.notes ?? "",
    bodyMeasurements: normalizeBodyMeasurements(c.bodyMeasurements),
    nextFollowUpAt: c.nextFollowUpAt
      ? c.nextFollowUpAt.toISOString().slice(0, 16)
      : null,
  };
}
