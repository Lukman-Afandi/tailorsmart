import "server-only";

import { OrderStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { analyticsTag } from "@/lib/cache-tags";

export type AnalyticsDayPoint = {
  day: string;
  revenue: number;
  orders: number;
};

async function fetchAnalyticsSeries(
  businessId: string,
  days: number,
): Promise<AnalyticsDayPoint[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const orders = await prisma.order.findMany({
    where: {
      businessId,
      createdAt: { gte: start },
    },
    select: {
      createdAt: true,
      amount: true,
      status: true,
    },
  });

  const map = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { revenue: 0, orders: 0 });
  }

  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    if (o.status === OrderStatus.COMPLETED || o.status === OrderStatus.PICKED_UP) {
      bucket.revenue += Number(o.amount);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, revenue: v.revenue, orders: v.orders }));
}

export function getCachedAnalyticsSeries(businessId: string, days = 14) {
  const cached = unstable_cache(
    () => fetchAnalyticsSeries(businessId, days),
    ["analytics-series", businessId, String(days)],
    { tags: [analyticsTag(businessId)], revalidate: 120 },
  );
  return cached();
}
