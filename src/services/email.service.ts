import "server-only";

import { logger } from "@/lib/logger";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Resend API — https://resend.com/docs/api-reference/emails/send-email
 * Tanpa SDK agar ringan; set RESEND_API_KEY di production.
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "TailorFlow <onboarding@resend.dev>";

  if (!key) {
    logger.info("email.skipped_no_resend_key", { to: input.to, subject: input.subject });
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error("email.resend_failed", { status: res.status, body });
      return { ok: false, error: "Gagal mengirim email" };
    }
    logger.info("email.sent", { to: input.to, subject: input.subject });
    return { ok: true };
  } catch (e) {
    logger.error("email.resend_exception", {
      message: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, error: "Gagal mengirim email" };
  }
}
