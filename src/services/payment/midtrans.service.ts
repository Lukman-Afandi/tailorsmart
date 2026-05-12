import "server-only";

import { createHash } from "crypto";
import { logger } from "@/lib/logger";

/** Verifikasi tanda tangan webhook Midtrans (SHA512). */
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
