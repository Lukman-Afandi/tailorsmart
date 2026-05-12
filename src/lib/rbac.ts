import type { UserRole } from "@prisma/client";
import { hasPermission, Permission } from "@/lib/permissions";

export function canExportData(role: UserRole): boolean {
  return hasPermission(role, Permission.EXPORT_DATA);
}

export function canViewAuditLog(role: UserRole): boolean {
  return hasPermission(role, Permission.AUDIT_VIEW);
}

export function canManageInvoices(role: UserRole): boolean {
  return hasPermission(role, Permission.INVOICE_MANAGE);
}

export function canManageTeam(role: UserRole): boolean {
  return hasPermission(role, Permission.EMPLOYEE_MANAGE);
}

export function canManageOrders(role: UserRole): boolean {
  return hasPermission(role, Permission.ORDER_MANAGE);
}

export function canManageCustomers(role: UserRole): boolean {
  return hasPermission(role, Permission.CUSTOMER_MANAGE);
}

export function canUpdateStitchProgress(role: UserRole): boolean {
  return hasPermission(role, Permission.ORDER_PROGRESS);
}

export function canViewBilling(role: UserRole): boolean {
  return hasPermission(role, Permission.BILLING_MANAGE);
}

export function canDeleteOrder(role: UserRole): boolean {
  return hasPermission(role, Permission.ORDER_MANAGE);
}

export function roleLabelId(role: UserRole): string {
  switch (role) {
    case "OWNER":
      return "Pemilik";
    case "ADMIN":
      return "Admin";
    case "PEGAWAI":
      return "Pegawai";
    default:
      return role;
  }
}

/** @deprecated gunakan hasPermission dari @/lib/permissions */
export { hasPermission } from "@/lib/permissions";
