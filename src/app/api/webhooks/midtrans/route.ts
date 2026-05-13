import { NextResponse } from "next/server";
import { processMidtransNotification } from "@/services/billing/midtrans-notification.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Webhook Midtrans — verifikasi signature + GET status server-side, lalu update langganan.
 * Daftarkan URL ini di dashboard Midtrans (Production / Sandbox).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await processMidtransNotification(
    body as Record<string, unknown>,
  );

  if (!result.ok) {
    logger.warn("midtrans.webhook_rejected", {
      message: result.message,
      status: result.httpStatus,
    });
    return NextResponse.json(
      { error: result.message },
      { status: result.httpStatus },
    );
  }

  return NextResponse.json({ ok: true });
}

export function GET() {
  return new NextResponse("Midtrans webhook — gunakan POST", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
