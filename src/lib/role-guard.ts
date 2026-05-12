import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@/lib/permissions";

export async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user?.businessId || !session.user.role) {
    redirect("/login");
  }
  if (!hasPermission(session.user.role, permission)) {
    redirect("/dashboard/forbidden");
  }
  return session;
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
) {
  const session = await auth();
  if (!session?.user?.businessId || !session.user.role) {
    redirect("/login");
  }
  if (!hasAnyPermission(session.user.role, permissions)) {
    redirect("/dashboard/forbidden");
  }
  return session;
}
