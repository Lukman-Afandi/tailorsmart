import type { Metadata } from "next";
import { auth } from "@/auth";
import { CustomersSection } from "@/components/customers/customers-section";
import { Permission } from "@/lib/permissions";
import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/role-guard";

export const metadata: Metadata = {
  title: "Pelanggan",
};

const PAGE_SIZE = 10;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission(Permission.CUSTOMER_MANAGE);
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) return null;

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const where = {
    businessId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <CustomersSection
      businessPlan={business.plan}
      initialQuery={q}
      initialPage={page}
      pageSize={PAGE_SIZE}
      total={total}
      totalPages={totalPages}
      rows={rows}
      exportEnabled={{
        pdf: PLAN_LIMITS[business.plan].exportPdf,
        excel: PLAN_LIMITS[business.plan].exportExcel,
      }}
      remindersEnabled={PLAN_LIMITS[business.plan].reminders}
    />
  );
}
