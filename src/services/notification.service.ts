import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function notifyTenant(input: {
  businessId: string;
  userId?: string | null;
  title: string;
  body: string;
  type?: string;
}) {
  await prisma.tenantNotification.create({
    data: {
      businessId: input.businessId,
      userId: input.userId ?? undefined,
      title: input.title,
      body: input.body,
      type: input.type ?? "info",
    },
  });
  logger.info("notification.created", {
    businessId: input.businessId,
    title: input.title,
  });
}
