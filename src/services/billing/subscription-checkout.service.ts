import "server-only";

import { randomUUID } from "crypto";
import { BillingProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BillingTransactionStatus } from "@/lib/billing/billing-transaction-status";
import {
  planGrossAmountIdr,
  type PaidSubscriptionPlan,
} from "@/lib/billing/plan-pricing";
import {
  midtransCreateSnapTransaction,
  readMidtransIsProduction,
} from "@/services/payment/midtrans.service";
import { MidtransApiError } from "@/types/midtrans";

/**
 * Buat baris BillingTransaction (PENDING), lalu minta token Snap ke Midtrans.
 * Order ID di Midtrans = id transaksi (untuk webhook).
 */
export async function createMidtransSubscriptionCheckout(input: {
  businessId: string;
  plan: PaidSubscriptionPlan;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  appBaseUrl: string;
}): Promise<{ token: string; billingTransactionId: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY tidak diset");
  }

  const isProduction = readMidtransIsProduction();
  const grossAmount = planGrossAmountIdr(input.plan);
  const orderId = randomUUID();

  const billing = await prisma.billingTransaction.create({
    data: {
      id: orderId,
      businessId: input.businessId,
      provider: BillingProvider.MIDTRANS,
      plan: input.plan,
      amount: grossAmount,
      status: BillingTransactionStatus.PENDING,
      externalId: orderId,
    },
  });

  const base = input.appBaseUrl.replace(/\/$/, "");
  const finish = `${base}/dashboard/billing?payment=finish`;

  try {
    const { token } = await midtransCreateSnapTransaction({
      serverKey,
      isProduction,
      orderId,
      grossAmount,
      customer: {
        email: input.customerEmail,
        firstName: input.customerName.trim() || "Pelanggan",
        phone: input.customerPhone,
      },
      itemName: `TailorFlow ${input.plan} — langganan 30 hari`,
      itemId: input.plan,
      callbacks: {
        finish,
        error: finish,
        pending: finish,
      },
    });
    return { token, billingTransactionId: billing.id };
  } catch (e) {
    await prisma.billingTransaction.update({
      where: { id: billing.id },
      data: { status: BillingTransactionStatus.FAILED },
    });
    if (e instanceof MidtransApiError) throw e;
    throw e instanceof Error ? e : new Error(String(e));
  }
}
