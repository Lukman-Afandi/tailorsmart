import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { OrderDetailClient } from "@/components/orders/order-detail-client";
import { canAccessOrderRow } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Detail order",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const businessId = session?.user?.businessId;
  const role = session?.user?.role;
  if (!businessId || !role) return null;

  const order = await prisma.order.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      attachments: { orderBy: { createdAt: "desc" } },
      revisions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      },
      invoice: true,
      business: {
        select: {
          name: true,
          phone: true,
          address: true,
          plan: true,
        },
      },
    },
  });

  if (!order) notFound();
  if (
    !canAccessOrderRow(role, session.user.id, order, businessId)
  ) {
    notFound();
  }

  const staffForAssign = await prisma.user.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  const initial = {
    id: order.id,
    title: order.title,
    description: order.description,
    status: order.status,
    category: order.category,
    stitchProgress: order.stitchProgress,
    priority: order.priority,
    paymentStatus: order.paymentStatus,
    dpAmount: Number(order.dpAmount),
    amountPaid: Number(order.amountPaid),
    amount: Number(order.amount),
    stitchDeadlineAt: order.stitchDeadlineAt?.toISOString() ?? null,
    estimatedCompletionAt: order.estimatedCompletionAt?.toISOString() ?? null,
    tailorNotes: order.tailorNotes,
    assignedUserId: order.assignedUserId,
    completionNotifiedAt: order.completionNotifiedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      phone: order.customer.phone,
    },
    business: order.business,
    attachments: order.attachments.map((a) => ({
      id: a.id,
      type: a.type,
      url: a.url,
      createdAt: a.createdAt.toISOString(),
    })),
    revisions: order.revisions.map((r) => ({
      id: r.id,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      user: r.user
        ? { name: r.user.name, email: r.user.email }
        : null,
    })),
    invoice: order.invoice
      ? {
          id: order.invoice.id,
          number: order.invoice.number,
          taxPercent: Number(order.invoice.taxPercent),
          issuedAt: order.invoice.issuedAt.toISOString(),
          notes: order.invoice.notes,
        }
      : null,
  };

  return (
    <OrderDetailClient
      role={role}
      businessPlan={order.business.plan}
      initial={initial}
      staffMembers={staffForAssign}
    />
  );
}
