"use server";

import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { addHours } from "date-fns";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkAuthRateLimitAsync } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/services/email.service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Email tidak valid" };
  const email = parsed.data.email.toLowerCase();

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const rl = await checkAuthRateLimitAsync("forgot", `${ip}:${email}`, {
    max: 6,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return {
      ok: false,
      error: "Terlalu banyak permintaan reset. Coba lagi nanti.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: true };
  }

  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  await prisma.passwordResetToken.create({
    data: {
      email,
      tokenHash,
      expiresAt: addHours(new Date(), 2),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendTransactionalEmail({
    to: email,
    subject: "Reset password TailorFlow",
    html: `<p>Reset password:</p><p><a href="${appUrl}/reset-password?token=${encodeURIComponent(raw)}">Atur ulang password</a> (2 jam).</p>`,
  });
  logger.info("password_reset.requested", { email });
  return { ok: true };
}

export async function resetPasswordAction(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid" };

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const rl = await checkAuthRateLimitAsync("forgot", `reset:${ip}`, {
    max: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return { ok: false, error: "Terlalu banyak percobaan. Coba lagi nanti." };
  }

  const tokenHash = hashToken(parsed.data.token);
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { ok: false, error: "Tautan tidak valid atau kadaluarsa" };

  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { email: row.email },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { email: row.email } }),
  ]);
  logger.info("password_reset.completed", { email: row.email });
  return { ok: true };
}
