import "server-only";

import type { Prisma, UserRole } from "@prisma/client";
import { OrderStatus } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { analyticsTag } from "@/lib/cache-tags";
import { orderScopeForRole } from "@/lib/order-access";

async function sumRevenueCurrentMonthScoped(scope: Prisma.OrderWhereInput) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const agg = await prisma.order.aggregate({
    where: {
      ...scope,
      createdAt: { gte: start, lt: end },
      status: { in: [OrderStatus.COMPLETED, OrderStatus.PICKED_UP] },
    },
    _sum: { amount: true },
  });

  return Number(agg._sum.amount ?? 0);
}

async function fetchDashboardStats(
  businessId: string,
  ctx?: { role: UserRole; userId: string },
) {
  const orderScope = ctx
    ? orderScopeForRole(businessId, ctx.role, ctx.userId)
    : { businessId };

  const isPegawai = ctx?.role === "PEGAWAI";

  const [totalCustomers, totalOrders, activeOrders, revenueMonth] =
    await Promise.all([
      isPegawai
        ? Promise.resolve(0)
        : prisma.customer.count({ where: { businessId } }),
      prisma.order.count({ where: orderScope }),
      prisma.order.count({
        where: {
          ...orderScope,
          status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
        },
      }),
      sumRevenueCurrentMonthScoped(orderScope),
    ]);

  return {
    totalCustomers,
    totalOrders,
    activeOrders,
    revenueMonth,
  };
}

export async function getDashboardStats(
  businessId: string,
  ctx?: { role: UserRole; userId: string },
) {
  const cacheRole = ctx?.role ?? "OWNER";
  const cacheUser = ctx?.role === "PEGAWAI" ? ctx.userId : "all";
  const cached = unstable_cache(
    () => fetchDashboardStats(businessId, ctx),
    ["dashboard-stats", businessId, cacheRole, cacheUser],
    { tags: [analyticsTag(businessId)], revalidate: 60 },
  );
  return cached();
}
