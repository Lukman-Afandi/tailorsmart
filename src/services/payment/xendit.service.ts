import "server-only";

import { logger } from "@/lib/logger";

/** Stub verifikasi callback Xendit — lengkapi dengan webhook token & verify di dashboard Xendit. */
export function verifyXenditWebhookToken(
  headerToken: string | null,
  expected: string | undefined,
): boolean {
  if (!expected) {
    logger.warn("xendit.webhook_token_not_configured");
    return false;
  }
  return !!headerToken && headerToken === expected;
}
