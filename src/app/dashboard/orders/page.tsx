import type { Metadata } from "next";
import { auth } from "@/auth";
import { OrdersSection } from "@/components/orders/orders-section";
import { orderScopeForRole } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";
import { serializeOrderRows } from "@/lib/serialize-order";

export const metadata: Metadata = {
  title: "Order",
};

export default async function OrdersPage() {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const role = session?.user?.role;
  if (!businessId || !role) return null;

  const orderWhere = orderScopeForRole(businessId, role, session.user.id);

  const [business, orders, customers, staffMembers] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.user.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <OrdersSection
      userRole={role}
      businessPlan={business.plan}
      initialOrders={serializeOrderRows(orders)}
      customers={customers}
      staffMembers={staffMembers}
    />
  );
}
