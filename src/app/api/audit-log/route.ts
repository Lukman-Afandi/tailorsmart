import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLog } from "@/lib/rbac";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const querySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().min(1).max(100).optional().default(30),
});

export async function GET(request: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!businessId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canViewAuditLog(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = checkRateLimit(
    getRequestLimiterKey(request, userId, "audit-log"),
    120,
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
  const parsed = querySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    take: searchParams.get("take") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Query tidak valid" }, { status: 400 });
  }

  const items = await prisma.auditLog.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: parsed.data.take + 1,
    ...(parsed.data.cursor
      ? { cursor: { id: parsed.data.cursor }, skip: 1 }
      : {}),
    select: {
      id: true,
      action: true,
      resource: true,
      resourceId: true,
      metadata: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  let nextCursor: string | null = null;
  let list = items;
  if (items.length > parsed.data.take) {
    const next = items.pop();
    nextCursor = next?.id ?? null;
    list = items;
  }

  return NextResponse.json({
    items: list.map((i) => ({
      id: i.id,
      action: i.action,
      resource: i.resource,
      resourceId: i.resourceId,
      metadata: i.metadata,
      createdAt: i.createdAt.toISOString(),
      user: i.user
        ? { name: i.user.name, email: i.user.email }
        : null,
    })),
    nextCursor,
  });
}
