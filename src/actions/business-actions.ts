"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionBusinessId } from "@/lib/tenant";
import {
  businessProfileSchema,
  type BusinessProfileValues,
} from "@/lib/validations/business";
import type { SubscriptionPlan } from "@prisma/client";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateBusinessProfileAction(
  input: BusinessProfileValues,
): Promise<ActionResult> {
  const businessId = await requireSessionBusinessId();
  const parsed = businessProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Validasi profil gagal" };
  }

  await prisma.business.update({
    where: { id: businessId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateBusinessLogoAction(logoUrl: string | null) {
  const businessId = await requireSessionBusinessId();
  await prisma.business.update({
    where: { id: businessId },
    data: { logoUrl },
  });
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
}

/** Demo / admin — dalam produksi hubungkan gateway pembayaran */
export async function updateBusinessPlanAction(plan: SubscriptionPlan) {
  const businessId = await requireSessionBusinessId();
  await prisma.business.update({
    where: { id: businessId },
    data: { plan },
  });
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
}
