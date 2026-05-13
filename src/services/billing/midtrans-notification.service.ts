import "server-only";

import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BillingTransactionStatus } from "@/lib/billing/billing-transaction-status";
import { isPaidSubscriptionPlan } from "@/lib/billing/plan-pricing";
import { finalizePaidSubscriptionFromMidtrans } from "@/services/billing.service";
import {
  midtransFetchTransactionStatus,
  readMidtransIsProduction,
  verifyMidtransSignature,
} from "@/services/payment/midtrans.service";
import type { MidtransTransactionStatusBody } from "@/types/midtrans";
import { logger } from "@/lib/logger";

export type MidtransNotificationResult =
  | { ok: true }
  | { ok: false; httpStatus: number; message: string };

function fraudAcceptable(remote: MidtransTransactionStatusBody): boolean {
  const fraud = remote.fraud_status;
  if (fraud === undefined || fraud === null || fraud === "") return true;
  return String(fraud) === "accept";
}

export async function processMidtransNotification(
  body: Record<string, unknown>,
): Promise<MidtransNotificationResult> {
  const orderId = String(body.order_id ?? "");
  const statusCode = String(body.status_code ?? "");
  const grossAmount = String(body.gross_amount ?? "");
  const signatureKey = String(body.signature_key ?? "");
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";

  if (!orderId) {
    return { ok: false, httpStatus: 400, message: "Missing order_id" };
  }

  if (!serverKey) {
    logger.warn("midtrans.webhook_no_server_key");
    return { ok: true };
  }

  if (
    !signatureKey ||
    !verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      serverKey,
      signatureKey,
    })
  ) {
    return { ok: false, httpStatus: 401, message: "Bad signature" };
  }

  let remote: MidtransTransactionStatusBody;
  try {
    remote = await midtransFetchTransactionStatus({
      serverKey,
      isProduction: readMidtransIsProduction(),
      orderId,
    });
  } catch {
    return {
      ok: false,
      httpStatus: 502,
      message: "Status verification failed",
    };
  }

  const remoteGross = String(remote.gross_amount ?? "");
  if (remoteGross !== grossAmount) {
    logger.warn("midtrans.gross_amount_mismatch", { orderId });
    return { ok: false, httpStatus: 400, message: "Amount mismatch" };
  }

  const tx = await prisma.billingTransaction.findFirst({
    where: { id: orderId },
  });

  if (!tx) {
    logger.warn("midtrans.unknown_order", { orderId });
    return { ok: true };
  }

  const transactionStatus = String(
    remote.transaction_status ?? body.transaction_status ?? "",
  );

  if (transactionStatus === "pending") {
    if (tx.status !== BillingTransactionStatus.PAID) {
      await prisma.billingTransaction.update({
        where: { id: tx.id },
        data: { status: BillingTransactionStatus.PENDING },
      });
    }
    return { ok: true };
  }

  if (transactionStatus === "expire") {
    if (tx.status !== BillingTransactionStatus.PAID) {
      await prisma.billingTransaction.update({
        where: { id: tx.id },
        data: { status: BillingTransactionStatus.EXPIRED },
      });
    }
    return { ok: true };
  }

  if (transactionStatus === "cancel") {
    if (tx.status !== BillingTransactionStatus.PAID) {
      await prisma.billingTransaction.update({
        where: { id: tx.id },
        data: { status: BillingTransactionStatus.CANCELLED },
      });
    }
    return { ok: true };
  }

  const success =
    fraudAcceptable(remote) &&
    (transactionStatus === "settlement" || transactionStatus === "capture");

  if (!success) {
    if (
      ["deny", "failure", "refund", "partial_refund", "chargeback"].includes(
        transactionStatus,
      )
    ) {
      if (tx.status !== BillingTransactionStatus.PAID) {
        await prisma.billingTransaction.update({
          where: { id: tx.id },
          data: { status: BillingTransactionStatus.FAILED },
        });
      }
    }
    return { ok: true };
  }

  if (tx.status === BillingTransactionStatus.PAID) {
    return { ok: true };
  }

  const plan = tx.plan;
  if (!isPaidSubscriptionPlan(plan)) {
    logger.error("midtrans.unexpected_free_plan", { orderId });
    return { ok: true };
  }

  const paidRounded = Math.round(Number.parseFloat(remoteGross));
  if (!Number.isFinite(paidRounded) || paidRounded !== tx.amount) {
    logger.warn("midtrans.paid_amount_mismatch", {
      orderId,
      paidRounded,
      expected: tx.amount,
    });
    return { ok: false, httpStatus: 400, message: "Paid amount mismatch" };
  }

  const paidAt = new Date();

  await finalizePaidSubscriptionFromMidtrans({
    businessId: tx.businessId,
    billingTransactionId: tx.id,
    plan: plan as SubscriptionPlan,
    amountIdr: tx.amount,
    paidAt,
    raw: remote,
  });

  return { ok: true };
}
