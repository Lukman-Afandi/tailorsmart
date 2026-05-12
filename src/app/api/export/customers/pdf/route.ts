import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

  if (!PLAN_LIMITS[business.plan].exportPdf) {
    return NextResponse.json(
      { error: "Export PDF tersedia mulai paket Basic." },
      { status: 403 },
    );
  }

  const customers = await prisma.customer.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    take: 500,
  });

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`Daftar Pelanggan — ${business.name}`, 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [["Nama", "Telepon", "Alamat", "Catatan"]],
    body: customers.map((c) => [
      c.name,
      c.phone,
      (c.address ?? "").slice(0, 80),
      (c.notes ?? "").slice(0, 80),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const buffer = Buffer.from(doc.output("arraybuffer"));

  const filename = `pelanggan-${business.slug}-${Date.now()}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
