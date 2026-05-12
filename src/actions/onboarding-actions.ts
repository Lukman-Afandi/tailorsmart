"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionBusinessId } from "@/lib/tenant";

export async function completeOnboardingAction(): Promise<{ ok: boolean }> {
  const businessId = await requireSessionBusinessId();
  await prisma.business.update({
    where: { id: businessId },
    data: { onboardingCompletedAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}
