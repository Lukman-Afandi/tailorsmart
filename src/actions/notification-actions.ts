"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionBusinessId } from "@/lib/tenant";

export async function markNotificationReadAction(id: string) {
  const businessId = await requireSessionBusinessId();
  await prisma.tenantNotification.updateMany({
    where: { id, businessId },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
}
