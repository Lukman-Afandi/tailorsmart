import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Building2,
  UserCog,
  BarChart3,
  CalendarDays,
  ScrollText,
  CreditCard,
  Bell,
} from "lucide-react";
import {
  hasAnyPermission,
  hasPermission,
  Permission,
} from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

type PermissionValue = (typeof Permission)[keyof typeof Permission];

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Jika diisi, salah satu permission cukup. */
  anyOf?: readonly PermissionValue[];
  /** Satu permission wajib. */
  permission?: PermissionValue;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  {
    href: "/dashboard/customers",
    label: "Pelanggan",
    icon: Users,
    permission: Permission.CUSTOMER_MANAGE,
  },
  {
    href: "/dashboard/orders",
    label: "Order",
    icon: ShoppingBag,
    anyOf: [Permission.ORDER_MANAGE, Permission.ORDER_PROGRESS],
  },
  {
    href: "/dashboard/production-calendar",
    label: "Kalender produksi",
    icon: CalendarDays,
    anyOf: [Permission.ORDER_MANAGE, Permission.ORDER_PROGRESS],
  },
  {
    href: "/dashboard/analytics",
    label: "Analitik",
    icon: BarChart3,
    anyOf: [
      Permission.ANALYTICS_VIEW_LIMITED,
      Permission.ANALYTICS_VIEW_FULL,
    ],
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: CreditCard,
    permission: Permission.BILLING_MANAGE,
  },
  {
    href: "/dashboard/notifications",
    label: "Notifikasi",
    icon: Bell,
    permission: Permission.NOTIFICATIONS_VIEW,
  },
  {
    href: "/dashboard/audit",
    label: "Audit log",
    icon: ScrollText,
    permission: Permission.AUDIT_VIEW,
  },
  {
    href: "/dashboard/team",
    label: "Tim",
    icon: UserCog,
    permission: Permission.EMPLOYEE_MANAGE,
  },
  {
    href: "/dashboard/profile",
    label: "Profil bisnis",
    icon: Building2,
    permission: Permission.PROFILE_EDIT,
  },
];

export function filterNavForRole(
  role: UserRole,
  items: DashboardNavItem[] = dashboardNavItems,
): DashboardNavItem[] {
  return items.filter((item) => {
    if (item.permission) {
      return hasPermission(role, item.permission);
    }
    if (item.anyOf?.length) {
      return hasAnyPermission(role, item.anyOf);
    }
    return true;
  });
}
