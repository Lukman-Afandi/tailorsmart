import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  ORDER_PRIORITY_LABEL,
  PAYMENT_STATUS_LABEL,
  STITCH_CATEGORY_LABEL,
  STITCH_PROGRESS_LABEL,
} from "@/lib/enterprise-labels";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { canExportData } from "@/lib/rbac";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

function escapeCsv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(request: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!businessId || !userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canExportData(role)) {
    return NextResponse.json(
      { error: "Export hanya untuk pemilik atau admin." },
      { status: 403 },
    );
  }

  const rl = checkRateLimit(
    getRequestLimiterKey(request, userId, "export-orders-csv"),
    12,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu sering export" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  if (!PLAN_LIMITS[business.plan].exportExcel) {
    return NextResponse.json(
      { error: "Export CSV tersedia mulai paket Basic." },
      { status: 403 },
    );
  }

  const orders = await prisma.order.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  const header = [
    "judul",
    "pelanggan",
    "telepon",
    "status",
    "kategori",
    "progress",
    "prioritas",
    "pembayaran",
    "tagihan",
    "dibayar",
    "dp",
    "deadline",
    "estimasi",
    "dibuat",
  ];

  const lines = [header.join(",")];
  for (const o of orders) {
    lines.push(
      [
        escapeCsv(o.title),
        escapeCsv(o.customer.name),
        escapeCsv(o.customer.phone),
        escapeCsv(ORDER_STATUS_LABEL[o.status]),
        escapeCsv(STITCH_CATEGORY_LABEL[o.category]),
        escapeCsv(STITCH_PROGRESS_LABEL[o.stitchProgress]),
        escapeCsv(ORDER_PRIORITY_LABEL[o.priority]),
        escapeCsv(PAYMENT_STATUS_LABEL[o.paymentStatus]),
        escapeCsv(String(Number(o.amount))),
        escapeCsv(String(Number(o.amountPaid))),
        escapeCsv(String(Number(o.dpAmount))),
        escapeCsv(o.stitchDeadlineAt ? o.stitchDeadlineAt.toISOString() : ""),
        escapeCsv(
          o.estimatedCompletionAt ? o.estimatedCompletionAt.toISOString() : "",
        ),
        escapeCsv(o.createdAt.toISOString()),
      ].join(","),
    );
  }

  const body = lines.join("\n");

  await writeAuditLog({
    businessId,
    userId,
    action: "EXPORT_ORDERS_CSV",
    resource: "Order",
    metadata: { count: orders.length },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = `order-${business.slug}-${Date.now()}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
