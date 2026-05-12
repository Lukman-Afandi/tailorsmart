import type { UserRole } from "@prisma/client";

/** Permission string — dipakai di hasPermission, nav, dan server guards. */
export const Permission = {
  BILLING_MANAGE: "billing:manage",
  SUBSCRIPTION_MANAGE: "subscription:manage",
  BUSINESS_DELETE: "business:delete",
  EMPLOYEE_MANAGE: "employee:manage",
  AUDIT_VIEW: "audit:view",
  EXPORT_DATA: "export:data",
  ANALYTICS_VIEW_FULL: "analytics:view_full",
  ANALYTICS_VIEW_LIMITED: "analytics:view_limited",
  CUSTOMER_MANAGE: "customer:manage",
  ORDER_MANAGE: "order:manage",
  ORDER_PROGRESS: "order:progress",
  INVOICE_MANAGE: "invoice:manage",
  NOTIFICATIONS_VIEW: "notifications:view",
  PROFILE_EDIT: "profile:edit",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL = new Set(Object.values(Permission));

const OWNER_PERMS = ALL;

const ADMIN_PERMS = new Set<Permission>([
  Permission.ORDER_MANAGE,
  Permission.ORDER_PROGRESS,
  Permission.CUSTOMER_MANAGE,
  Permission.INVOICE_MANAGE,
  Permission.ANALYTICS_VIEW_LIMITED,
  Permission.AUDIT_VIEW,
  Permission.EXPORT_DATA,
  Permission.NOTIFICATIONS_VIEW,
  Permission.PROFILE_EDIT,
]);

/** Pegawai: progres jahitan + order yang di-scope (assign / pool). */
const PEGAWAI_PERMS = new Set<Permission>([
  Permission.ORDER_PROGRESS,
  Permission.NOTIFICATIONS_VIEW,
  Permission.PROFILE_EDIT,
]);

const BY_ROLE: Record<UserRole, Set<Permission>> = {
  OWNER: OWNER_PERMS,
  ADMIN: ADMIN_PERMS,
  PEGAWAI: PEGAWAI_PERMS,
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return BY_ROLE[role]?.has(permission) ?? false;
}

export function hasAnyPermission(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  const set = BY_ROLE[role];
  if (!set) return false;
  return permissions.some((p) => set.has(p));
}

export function permissionsForRole(role: UserRole): ReadonlySet<Permission> {
  return BY_ROLE[role] ?? PEGAWAI_PERMS;
}
