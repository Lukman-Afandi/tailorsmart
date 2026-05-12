"use server";

import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { hash } from "bcryptjs";
import { headers } from "next/headers";
import { TenantSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { checkAuthRateLimitAsync } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/services/email.service";
import { notifyTenant } from "@/services/notification.service";
import { logger } from "@/lib/logger";
import {
  registerSchema,
  type RegisterInput,
} from "@/lib/validations/auth";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "tailor";
  let attempt = 0;
  while (attempt < 10) {
    const exists = await prisma.business.findUnique({ where: { slug } });
    if (!exists) return slug;
    attempt += 1;
    slug = `${slugify(base)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return `${slugify(base)}-${Date.now()}`;
}

export async function registerAction(
  input: RegisterInput,
): Promise<ActionResult<{ email: string }>> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const rl = await checkAuthRateLimitAsync("register", ip, {
    max: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan pendaftaran. Coba lagi nanti.",
    };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    return { ok: false, error: "Validasi gagal", fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Email sudah terdaftar" };
  }

  const slug = await uniqueSlug(parsed.data.businessName);
  const passwordHash = await hash(parsed.data.password, 12);

  const verifyToken = randomBytes(32).toString("hex");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { businessId } = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: parsed.data.businessName,
        slug,
        plan: "FREE",
        subscriptionStatus: TenantSubscriptionStatus.TRIALING,
        trialEndsAt: addDays(new Date(), 7),
        onboardingCompletedAt: null,
      },
    });

    await tx.branch.create({
      data: {
        businessId: business.id,
        name: "Pusat",
        slug: "pusat",
        isDefault: true,
      },
    });

    await tx.user.create({
      data: {
        email,
        name: parsed.data.ownerName,
        passwordHash,
        businessId: business.id,
        role: "OWNER",
      },
    });

    await tx.verificationToken.deleteMany({ where: { identifier: email } });

    await tx.verificationToken.create({
      data: {
        identifier: email,
        token: verifyToken,
        expires: addDays(new Date(), 2),
      },
    });

    return { businessId: business.id };
  });

  await notifyTenant({
    businessId,
    title: "Selamat datang di TailorFlow",
    body: "Trial 7 hari aktif dengan fitur PRO. Selesaikan onboarding di dashboard.",
  });

  const sent = await sendTransactionalEmail({
    to: email,
    subject: "Verifikasi email TailorFlow",
    html: `<p>Halo ${parsed.data.ownerName},</p>
<p>Klik tautan untuk memverifikasi email Anda (berlaku 48 jam):</p>
<p><a href="${appUrl}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}&email=${encodeURIComponent(email)}">Verifikasi email</a></p>`,
  });
  if (!sent.ok) {
    logger.warn("register.verify_email_send_failed", { email });
  }

  return { ok: true, data: { email } };
}
