import { NextResponse } from "next/server";
import { verifyMidtransSignature } from "@/services/payment/midtrans.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Webhook Midtrans — validasi signature & proses status pembayaran.
 * Hubungkan URL ini di dashboard Midtrans production.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const orderId = String((body as { order_id?: string }).order_id ?? "");
  const statusCode = String((body as { status_code?: string }).status_code ?? "");
  const grossAmount = String((body as { gross_amount?: string }).gross_amount ?? "");
  const signatureKey = String((body as { signature_key?: string }).signature_key ?? "");
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";

  if (!serverKey || !signatureKey) {
    logger.warn("midtrans.webhook_missing_keys");
    return NextResponse.json({ ok: true });
  }

  const ok = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    serverKey,
    signatureKey,
  });
  if (!ok) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  logger.info("midtrans.webhook_ok", { orderId, statusCode });
  // TODO: map order_id ke SubscriptionEvent + applyPlanToBusiness
  return NextResponse.json({ ok: true });
}
