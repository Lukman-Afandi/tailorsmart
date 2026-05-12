import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canExportData } from "@/lib/rbac";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

/** Metadata export “semua data” — file besar lewat job / object storage di produksi. */
export async function GET(request: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!businessId || !userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canExportData(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = checkRateLimit(
    getRequestLimiterKey(request, userId, "export-all"),
    5,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  await writeAuditLog({
    businessId,
    userId,
    action: "EXPORT_ALL_META",
    resource: "Business",
    resourceId: businessId,
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({
    ok: true,
    endpoints: {
      customersExcel: `${base}/api/export/customers/excel`,
      customersPdf: `${base}/api/export/customers/pdf`,
      ordersExcel: `${base}/api/export/orders/excel`,
      ordersCsv: `${base}/api/export/orders/csv`,
    },
    hint: "Gunakan job terjadwal + storage S3 untuk arsip penuh database.",
  });
}
