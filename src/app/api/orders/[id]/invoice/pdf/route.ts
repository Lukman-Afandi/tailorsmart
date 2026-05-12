import { NextResponse } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { auth } from "@/auth";
import { formatCurrencyIdr } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { canManageInvoices } from "@/lib/rbac";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";
import {
  ORDER_PRIORITY_LABEL,
  PAYMENT_STATUS_LABEL,
  STITCH_CATEGORY_LABEL,
  STITCH_PROGRESS_LABEL,
} from "@/lib/enterprise-labels";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { balanceDue, invoiceGrandTotal } from "@/lib/order-payment";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await context.params;
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!businessId || !userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageInvoices(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = checkRateLimit(
    getRequestLimiterKey(request, userId, `invoice-pdf-${orderId}`),
    40,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan PDF" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  if (!PLAN_LIMITS[business.plan].exportPdf) {
    return NextResponse.json(
      { error: "PDF faktur tersedia mulai paket Basic." },
      { status: 403 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      customer: true,
      invoice: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  if (!order.invoice) {
    return NextResponse.json(
      { error: "Buat faktur di detail order terlebih dahulu." },
      { status: 400 },
    );
  }

  const subtotal = Number(order.amount);
  const taxPct = Number(order.invoice.taxPercent);
  const { tax, total } = invoiceGrandTotal(subtotal, taxPct);
  const dp = Number(order.dpAmount);
  const paid = Number(order.amountPaid);
  const sisaTagihan = balanceDue(total, paid);

  const doc = new jsPDF({ orientation: "portrait" });
  doc.setFontSize(16);
  doc.text(business.name, 14, 18);
  doc.setFontSize(10);
  doc.text(`Faktur: ${order.invoice.number}`, 14, 26);
  doc.text(
    `Tanggal: ${order.invoice.issuedAt.toLocaleString("id-ID")}`,
    14,
    32,
  );
  doc.text(`Pelanggan: ${order.customer.name}`, 14, 40);
  doc.text(`Telepon: ${order.customer.phone}`, 14, 46);

  autoTable(doc, {
    startY: 54,
    head: [["Deskripsi", "Nilai"]],
    body: [
      ["Judul order", order.title],
      ["Kategori", STITCH_CATEGORY_LABEL[order.category]],
      ["Progress jahitan", STITCH_PROGRESS_LABEL[order.stitchProgress]],
      ["Status order", ORDER_STATUS_LABEL[order.status]],
      ["Prioritas", ORDER_PRIORITY_LABEL[order.priority]],
      ["Subtotal order", formatCurrencyIdr(subtotal)],
      [`Pajak (${taxPct}%)`, formatCurrencyIdr(tax)],
      ["Total tagihan (setelah pajak)", formatCurrencyIdr(total)],
      ["Uang muka (DP)", formatCurrencyIdr(dp)],
      ["Telah dibayar", formatCurrencyIdr(paid)],
      ["Sisa tagihan", formatCurrencyIdr(sisaTagihan)],
      ["Status pembayaran", PAYMENT_STATUS_LABEL[order.paymentStatus]],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY;
  let y = (finalY ?? 120) + 10;
  if (order.invoice.notes) {
    doc.setFontSize(9);
    doc.text("Catatan faktur:", 14, y);
    y += 6;
    doc.text(order.invoice.notes.slice(0, 500), 14, y, { maxWidth: 180 });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `${order.invoice.number}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
