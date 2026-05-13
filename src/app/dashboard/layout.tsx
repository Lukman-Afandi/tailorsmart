import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyExpiredSubscriptionIfNeeded } from "@/lib/subscription-expiry";
import { TenantGate } from "@/components/dashboard/tenant-gate";
import { DashboardDesktopSidebar } from "@/components/layout/dashboard-nav";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SessionProvider } from "@/components/providers/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.businessId) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      suspendedAt: true,
      onboardingCompletedAt: true,
    },
  });

  if (!business) {
    redirect("/login");
  }

  await applyExpiredSubscriptionIfNeeded(business.id);

  return (
    <SessionProvider session={session}>
      <TenantGate
        suspended={!!business.suspendedAt}
        onboardingDone={!!business.onboardingCompletedAt}
      />
      <div className="flex min-h-screen w-full">
        <DashboardDesktopSidebar
          businessName={business.name}
          logoUrl={business.logoUrl}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader
            businessName={business.name}
            logoUrl={business.logoUrl}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
