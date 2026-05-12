import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { formatCurrencyIdr } from "@/lib/utils";
import { balanceDue, invoiceGrandTotal } from "@/lib/order-payment";
import { PAYMENT_STATUS_LABEL } from "@/lib/enterprise-labels";
import { prisma } from "@/lib/prisma";
import { canManageInvoices } from "@/lib/rbac";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** HTML sempit (~58mm) untuk window.print() di printer thermal. */
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
    getRequestLimiterKey(request, userId, `invoice-thermal-${orderId}`),
    40,
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

  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
    include: { customer: true, invoice: true, business: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const subtotal = Number(order.amount);
  const taxPct = order.invoice ? Number(order.invoice.taxPercent) : 0;
  const { tax, total } = invoiceGrandTotal(subtotal, taxPct);
  const dp = Number(order.dpAmount);
  const paid = Number(order.amountPaid);
  const sisaTagihan = balanceDue(total, paid);

  const invNo = order.invoice?.number ?? "(draft)";
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${invNo}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      margin: 0;
      padding: 8px;
      width: 58mm;
      font-size: 11px;
      color: #111;
    }
    h1 { font-size: 13px; margin: 0 0 4px; }
    .muted { color: #555; font-size: 10px; }
    .row { display: flex; justify-content: space-between; gap: 4px; margin: 2px 0; }
    hr { border: none; border-top: 1px dashed #999; margin: 6px 0; }
    .total { font-weight: 700; font-size: 12px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(order.business.name)}</h1>
  <div class="muted">Thermal · ${escapeHtml(invNo)}</div>
  <hr />
  <div class="row"><span>Pelanggan</span><span>${escapeHtml(order.customer.name)}</span></div>
  <div class="row"><span>Telp</span><span>${escapeHtml(order.customer.phone)}</span></div>
  <div class="row"><span>Order</span><span>${escapeHtml(order.title)}</span></div>
  <hr />
  <div class="row"><span>Subtotal</span><span>${escapeHtml(formatCurrencyIdr(subtotal))}</span></div>
  <div class="row"><span>Pajak</span><span>${escapeHtml(formatCurrencyIdr(tax))}</span></div>
  <div class="row total"><span>Total tagihan</span><span>${escapeHtml(formatCurrencyIdr(total))}</span></div>
  <div class="row"><span>Uang muka</span><span>${escapeHtml(formatCurrencyIdr(dp))}</span></div>
  <div class="row"><span>Dibayar</span><span>${escapeHtml(formatCurrencyIdr(paid))}</span></div>
  <div class="row total"><span>Sisa</span><span>${escapeHtml(formatCurrencyIdr(sisaTagihan))}</span></div>
  <div class="row"><span>Status</span><span>${escapeHtml(PAYMENT_STATUS_LABEL[order.paymentStatus])}</span></div>
  <hr />
  <div class="muted">${new Date().toLocaleString("id-ID")}</div>
  <button class="no-print" type="button" onclick="window.print()">Cetak</button>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
