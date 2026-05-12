import type { Metadata } from "next";
import { OrderStatus } from "@prisma/client";
import { auth } from "@/auth";
import { ProductionCalendar } from "@/components/production/production-calendar";
import { orderScopeForRole } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Kalender produksi",
};

export default async function ProductionCalendarPage() {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!businessId || !role || !userId) return null;

  const scope = orderScopeForRole(businessId, role, userId);

  const orders = await prisma.order.findMany({
    where: {
      AND: [
        scope,
        {
          OR: [
            { stitchDeadlineAt: { not: null } },
            { estimatedCompletionAt: { not: null } },
          ],
        },
        { status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] } },
      ],
    },
    orderBy: [{ stitchDeadlineAt: "asc" }, { estimatedCompletionAt: "asc" }],
    take: 200,
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  const payload = orders.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    priority: o.priority,
    stitchDeadlineAt: o.stitchDeadlineAt?.toISOString() ?? null,
    estimatedCompletionAt: o.estimatedCompletionAt?.toISOString() ?? null,
    customer: o.customer,
  }));

  return <ProductionCalendar initial={payload} />;
}
