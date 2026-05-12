import "server-only";

import { prisma } from "@/lib/prisma";

export async function countOrdersInCurrentMonth(businessId: string) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return prisma.order.count({
    where: {
      businessId,
      createdAt: { gte: start, lt: end },
    },
  });
}

export async function sumRevenueCurrentMonth(businessId: string) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const agg = await prisma.order.aggregate({
    where: {
      businessId,
      createdAt: { gte: start, lt: end },
      status: { in: ["COMPLETED", "PICKED_UP"] },
    },
    _sum: { amount: true },
  });

  return Number(agg._sum.amount ?? 0);
}
