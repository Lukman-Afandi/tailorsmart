import type { Prisma, UserRole } from "@prisma/client";

/**
 * Filter order untuk pegawai: order belum di-assign (pool) atau di-assign ke user ini.
 * Owner & admin melihat seluruh order tenant.
 */
export function orderScopeForRole(
  businessId: string,
  role: UserRole,
  userId: string,
): Prisma.OrderWhereInput {
  const base: Prisma.OrderWhereInput = { businessId };
  if (role === "PEGAWAI") {
    return {
      ...base,
      OR: [{ assignedUserId: null }, { assignedUserId: userId }],
    };
  }
  return base;
}

export function canAccessOrderRow(
  role: UserRole,
  userId: string,
  order: { businessId: string; assignedUserId: string | null },
  sessionBusinessId: string,
): boolean {
  if (order.businessId !== sessionBusinessId) return false;
  if (role === "PEGAWAI") {
    return (
      order.assignedUserId === null || order.assignedUserId === userId
    );
  }
  return true;
}
