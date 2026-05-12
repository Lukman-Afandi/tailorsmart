import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { orderScopeForRole } from "@/lib/order-access";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { orderSearchQuerySchema } from "@/lib/validations/order";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!businessId || !userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(
    getRequestLimiterKey(request, userId, "orders-search"),
    90,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const raw = {
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? undefined,
  };
  const parsed = orderSearchQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const q = parsed.data.q.trim();
  const limit = parsed.data.limit;

  const scope = orderScopeForRole(businessId, role, userId);

  const orders = await prisma.order.findMany({
    where: {
      AND: [
        scope,
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q, mode: "insensitive" } } },
          ],
        },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      amount: true,
      updatedAt: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  });

  const payload = orders.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    amount: Number(o.amount),
    updatedAt: o.updatedAt.toISOString(),
    customer: o.customer,
  }));

  return NextResponse.json(
    { items: payload },
    {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    },
  );
}
