import "server-only";

import { prisma } from "@/lib/prisma";

function monthRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export async function countOrderAttachmentsThisMonth(businessId: string) {
  const { start, end } = monthRange();
  return prisma.orderAttachment.count({
    where: {
      createdAt: { gte: start, lt: end },
      order: { businessId },
    },
  });
}

export async function countAttachmentsForOrder(orderId: string) {
  return prisma.orderAttachment.count({
    where: { orderId },
  });
}
