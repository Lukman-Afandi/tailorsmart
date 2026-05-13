import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { canViewBilling } from "@/lib/rbac";
import { createMidtransSubscriptionCheckout } from "@/services/billing/subscription-checkout.service";
import { MidtransApiError } from "@/types/midtrans";
import { readMidtransIsProduction } from "@/services/payment/midtrans.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  plan: z.enum(["BASIC", "PROFESSIONAL"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canViewBilling(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (
    !process.env.MIDTRANS_SERVER_KEY ||
    !process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
  ) {
    return NextResponse.json(
      { error: "Pembayaran belum dikonfigurasi (Midtrans)." },
      { status: 503 },
    );
  }

  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    const { token, billingTransactionId } =
      await createMidtransSubscriptionCheckout({
        businessId: session.user.businessId,
        plan: parsed.data.plan,
        customerEmail: session.user.email,
        customerName: session.user.name ?? session.user.email,
        customerPhone: null,
        appBaseUrl,
      });

    return NextResponse.json({
      token,
      billingTransactionId,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
      isProduction: readMidtransIsProduction(),
    });
  } catch (e) {
    if (e instanceof MidtransApiError) {
      logger.warn("billing.create_transaction_midtrans_failed", {
        businessId: session.user.businessId,
      });
      return NextResponse.json(
        {
          error:
            "Gagal membuat transaksi pembayaran. Coba lagi dalam beberapa saat.",
        },
        { status: 502 },
      );
    }
    logger.error("billing.create_transaction_unexpected", {
      err: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
