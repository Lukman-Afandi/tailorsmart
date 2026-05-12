import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const customers = await prisma.customer.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  const rows = customers.map((c) => ({
    Nama: c.name,
    Telepon: c.phone,
    Alamat: c.address ?? "",
    Catatan: c.notes ?? "",
    Ukuran: c.bodyMeasurements
      ? JSON.stringify(c.bodyMeasurements)
      : "",
    "Follow-up": c.nextFollowUpAt
      ? c.nextFollowUpAt.toISOString()
      : "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Pelanggan");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

  const filename = `pelanggan-${business.slug}-${Date.now()}.xlsx`;

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
