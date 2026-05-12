import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { canExportData } from "@/lib/rbac";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";
import {
  ORDER_PRIORITY_LABEL,
  PAYMENT_STATUS_LABEL,
  STITCH_CATEGORY_LABEL,
  STITCH_PROGRESS_LABEL,
} from "@/lib/enterprise-labels";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

export const runtime = "nodejs";

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
    getRequestLimiterKey(request, userId, "export-orders-xlsx"),
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
      { error: "Export Excel tersedia mulai paket Basic." },
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

  const rows = orders.map((o) => ({
    Judul: o.title,
    Pelanggan: o.customer.name,
    Telepon: o.customer.phone,
    Status: ORDER_STATUS_LABEL[o.status],
    Kategori: STITCH_CATEGORY_LABEL[o.category],
    Progress: STITCH_PROGRESS_LABEL[o.stitchProgress],
    Prioritas: ORDER_PRIORITY_LABEL[o.priority],
    Pembayaran: PAYMENT_STATUS_LABEL[o.paymentStatus],
    Tagihan: Number(o.amount),
    Dibayar: Number(o.amountPaid),
    DP: Number(o.dpAmount),
    Deadline: o.stitchDeadlineAt ? o.stitchDeadlineAt.toISOString() : "",
    Estimasi: o.estimatedCompletionAt ? o.estimatedCompletionAt.toISOString() : "",
    Dibuat: o.createdAt.toISOString(),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Order");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

  await writeAuditLog({
    businessId,
    userId,
    action: "EXPORT_ORDERS_XLSX",
    resource: "Order",
    metadata: { count: orders.length },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = `order-${business.slug}-${Date.now()}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
