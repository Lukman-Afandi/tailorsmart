import { prisma } from "@/lib/prisma";
import { TenantAdminTable } from "@/components/admin/tenant-admin-table";

export default async function AdminTenantsPage() {
  const tenants = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      subscriptionStatus: true,
      suspendedAt: true,
      trialEndsAt: true,
      createdAt: true,
      _count: { select: { users: true, customers: true, orders: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitoring tenant</h1>
        <p className="text-sm text-zinc-400">
          Skala ribuan tenant — query terindeks, pagination siap ditambahkan.
        </p>
      </div>
      <TenantAdminTable tenants={tenants} />
    </div>
  );
}
