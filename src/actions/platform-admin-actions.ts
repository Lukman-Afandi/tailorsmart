"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { TenantSubscriptionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  PLATFORM_ADMIN_COOKIE,
  signPlatformAdminJwt,
} from "@/lib/platform-admin-token";
import { getPlatformAdminFromSession } from "@/lib/platform-admin-session";
import { logger } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function platformAdminLoginAction(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid" };

  const email = parsed.data.email.toLowerCase();
  const admin = await prisma.platformAdmin.findUnique({
    where: { email },
  });
  if (!admin) return { ok: false, error: "Kredensial salah" };

  const ok = await compare(parsed.data.password, admin.passwordHash);
  if (!ok) return { ok: false, error: "Kredensial salah" };

  const jwt = await signPlatformAdminJwt({ adminId: admin.id, email: admin.email });
  const jar = await cookies();
  jar.set(PLATFORM_ADMIN_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  logger.info("platform_admin.login", { email });
  revalidatePath("/admin");
  return { ok: true };
}

export async function platformAdminLogoutAction() {
  const jar = await cookies();
  jar.delete(PLATFORM_ADMIN_COOKIE);
  revalidatePath("/admin");
}

export async function suspendTenantAction(businessId: string) {
  const admin = await getPlatformAdminFromSession();
  if (!admin) throw new Error("Unauthorized");
  await prisma.business.update({
    where: { id: businessId },
    data: {
      suspendedAt: new Date(),
      subscriptionStatus: TenantSubscriptionStatus.SUSPENDED,
    },
  });
  logger.warn("platform_admin.suspend_tenant", { businessId, by: admin.email });
  revalidatePath("/admin/tenants");
}

export async function unsuspendTenantAction(businessId: string) {
  const admin = await getPlatformAdminFromSession();
  if (!admin) throw new Error("Unauthorized");
  await prisma.business.update({
    where: { id: businessId },
    data: {
      suspendedAt: null,
      subscriptionStatus: TenantSubscriptionStatus.ACTIVE,
    },
  });
  logger.info("platform_admin.unsuspend_tenant", { businessId, by: admin.email });
  revalidatePath("/admin/tenants");
}
