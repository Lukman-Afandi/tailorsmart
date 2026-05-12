import { NextResponse } from "next/server";
import { verifyXenditWebhookToken } from "@/services/payment/xendit.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("x-callback-token");
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!verifyXenditWebhookToken(token, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  logger.info("xendit.webhook", { bodyType: typeof body });
  return NextResponse.json({ ok: true });
}
