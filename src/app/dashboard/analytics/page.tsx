import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { hasPermission, Permission } from "@/lib/permissions";
import { PLAN_LIMITS } from "@/lib/plans";
import { effectivePlanForLimits } from "@/lib/subscription-state";
import { prisma } from "@/lib/prisma";
import { getCachedAnalyticsSeries } from "@/lib/queries/analytics-series";
import { requireAnyPermission } from "@/lib/role-guard";

export const metadata: Metadata = {
  title: "Analitik",
};

export default async function AnalyticsPage() {
  const session = await requireAnyPermission([
    Permission.ANALYTICS_VIEW_LIMITED,
    Permission.ANALYTICS_VIEW_FULL,
  ]);
  const businessId = session.user.businessId;

  const [series, business] = await Promise.all([
    getCachedAnalyticsSeries(businessId, 14),
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
  ]);

  const eff = effectivePlanForLimits(business);
  const full = PLAN_LIMITS[eff].fullAnalytics;
  const showAiInsights =
    full && hasPermission(session.user.role, Permission.ANALYTICS_VIEW_FULL);

  return (
    <AnalyticsDashboard
      plan={eff}
      fullAnalytics={full}
      showAiInsights={showAiInsights}
      series={series}
    />
  );
}
