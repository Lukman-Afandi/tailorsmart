import type { SubscriptionPlan } from "@prisma/client";

export const PLAN_LIMITS: Record<
  SubscriptionPlan,
  {
    maxCustomers: number | null;
    maxOrdersPerMonth: number | null;
    /** Total upload lampiran order per bulan (semua order di tenant). */
    maxOrderUploadsPerMonth: number | null;
    /** Maks file per satu order. */
    maxAttachmentsPerOrder: number | null;
    exportPdf: boolean;
    exportExcel: boolean;
    reminders: boolean;
    multiStaff: boolean;
    fullAnalytics: boolean;
    aiSizeRecommendation: boolean;
    prioritySupport: boolean;
  }
> = {
  FREE: {
    maxCustomers: 30,
    maxOrdersPerMonth: 20,
    maxOrderUploadsPerMonth: 40,
    maxAttachmentsPerOrder: 6,
    exportPdf: false,
    exportExcel: false,
    reminders: false,
    multiStaff: false,
    fullAnalytics: false,
    aiSizeRecommendation: false,
    prioritySupport: false,
  },
  BASIC: {
    maxCustomers: 500,
    maxOrdersPerMonth: null,
    maxOrderUploadsPerMonth: 500,
    maxAttachmentsPerOrder: 20,
    exportPdf: true,
    exportExcel: true,
    reminders: true,
    multiStaff: false,
    fullAnalytics: false,
    aiSizeRecommendation: false,
    prioritySupport: false,
  },
  PROFESSIONAL: {
    maxCustomers: null,
    maxOrdersPerMonth: null,
    maxOrderUploadsPerMonth: null,
    maxAttachmentsPerOrder: null,
    exportPdf: true,
    exportExcel: true,
    reminders: true,
    multiStaff: true,
    fullAnalytics: true,
    aiSizeRecommendation: true,
    prioritySupport: true,
  },
};

export type PlanLimits = (typeof PLAN_LIMITS)[SubscriptionPlan];

export function canAddCustomer(
  plan: SubscriptionPlan,
  currentCount: number,
): boolean {
  const max = PLAN_LIMITS[plan].maxCustomers;
  if (max === null) return true;
  return currentCount < max;
}

export function canCreateOrderThisMonth(
  plan: SubscriptionPlan,
  ordersThisMonth: number,
): boolean {
  const max = PLAN_LIMITS[plan].maxOrdersPerMonth;
  if (max === null) return true;
  return ordersThisMonth < max;
}
