"use server";

import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@prisma/client";
import { BillingProvider } from "@prisma/client";
import { applyPlanToBusiness } from "@/services/billing.service";
import { requireSessionBusinessId } from "@/lib/tenant";
import { canViewBilling } from "@/lib/rbac";
import { auth } from "@/auth";

export async function changePlanLocalAction(
  plan: SubscriptionPlan,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.role || !canViewBilling(session.user.role)) {
    return { ok: false, error: "Anda tidak punya akses billing." };
  }
  const businessId = await requireSessionBusinessId();
  await applyPlanToBusiness(businessId, plan, {
    provider: BillingProvider.NONE,
    raw: { source: "billing_dashboard_manual" },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
  return { ok: true };
}
