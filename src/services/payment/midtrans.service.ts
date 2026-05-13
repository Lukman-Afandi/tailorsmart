import "server-only";

import { createHash } from "crypto";
import type {
  MidtransSnapCreateResponse,
  MidtransTransactionStatusBody,
} from "@/types/midtrans";
import { MidtransApiError } from "@/types/midtrans";
import { logger } from "@/lib/logger";

/** Verifikasi tanda tangan webhook / notifikasi Midtrans (SHA512). */
export function verifyMidtransSignature(input: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}): boolean {
  const raw = `${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`;
  const expected = createHash("sha512").update(raw).digest("hex");
  const ok = expected.toLowerCase() === input.signatureKey.toLowerCase();
  if (!ok) logger.warn("midtrans.signature_mismatch", { orderId: input.orderId });
  return ok;
}

export function midtransBasicAuthHeader(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export function midtransApiBase(isProduction: boolean): string {
  return isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

export function midtransSnapScriptUrl(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function readMidtransIsProduction(): boolean {
  const v = process.env.MIDTRANS_IS_PRODUCTION;
  return v === "true" || v === "1";
}

export async function midtransCreateSnapTransaction(input: {
  serverKey: string;
  isProduction: boolean;
  orderId: string;
  grossAmount: number;
  customer: { email: string; firstName: string; phone?: string | null };
  itemName: string;
  itemId: string;
  callbacks?: { finish?: string; error?: string; pending?: string };
}): Promise<MidtransSnapCreateResponse> {
  const url = input.isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: midtransBasicAuthHeader(input.serverKey),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      customer_details: {
        email: input.customer.email,
        first_name: input.customer.firstName.slice(0, 50),
        ...(input.customer.phone
          ? { phone: String(input.customer.phone).slice(0, 20) }
          : {}),
      },
      item_details: [
        {
          id: input.itemId,
          price: input.grossAmount,
          quantity: 1,
          name: input.itemName.slice(0, 50),
        },
      ],
      ...(input.callbacks ? { callbacks: input.callbacks } : {}),
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.warn("midtrans.create_transaction_failed", {
      orderId: input.orderId,
      status: res.status,
      body: text.slice(0, 800),
    });
    throw new MidtransApiError(res.status, text);
  }

  const json = JSON.parse(text) as MidtransSnapCreateResponse;
  if (!json?.token) {
    throw new MidtransApiError(res.status, "Missing token in Midtrans response");
  }
  return json;
}

/** Verifikasi kedua: ambil status resmi dari API Midtrans. */
export async function midtransFetchTransactionStatus(input: {
  serverKey: string;
  isProduction: boolean;
  orderId: string;
}): Promise<MidtransTransactionStatusBody> {
  const url = `${midtransApiBase(input.isProduction)}/v2/${encodeURIComponent(input.orderId)}/status`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: midtransBasicAuthHeader(input.serverKey),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    logger.warn("midtrans.status_fetch_failed", {
      orderId: input.orderId,
      status: res.status,
    });
    throw new MidtransApiError(res.status, text);
  }
  return JSON.parse(text) as MidtransTransactionStatusBody;
}
