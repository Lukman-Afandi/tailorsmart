import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  PLATFORM_ADMIN_COOKIE,
  verifyPlatformAdminJwt,
} from "@/lib/platform-admin-token";

export async function getPlatformAdminFromSession() {
  const jar = await cookies();
  const token = jar.get(PLATFORM_ADMIN_COOKIE)?.value;
  const claims = await verifyPlatformAdminJwt(token);
  if (!claims) return null;
  const admin = await prisma.platformAdmin.findUnique({
    where: { id: claims.adminId },
  });
  if (!admin || admin.email.toLowerCase() !== claims.email.toLowerCase()) {
    return null;
  }
  return admin;
}

export async function clearPlatformAdminSession() {
  const jar = await cookies();
  jar.delete(PLATFORM_ADMIN_COOKIE);
}
