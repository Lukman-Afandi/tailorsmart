import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { EmptyStateHero } from "@/components/ui/empty-state-hero";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Notifikasi",
};

export default async function NotificationsPage() {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  if (!businessId || !userId) return null;

  const items = await prisma.tenantNotification.findMany({
    where: {
      businessId,
      OR: [{ userId: null }, { userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      body: true,
      readAt: true,
      createdAt: true,
    },
  });

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pusat notifikasi</h2>
          <p className="text-muted-foreground">
            Sinkron antar perangkat lewat refresh halaman & revalidate server.
          </p>
        </div>
        <EmptyStateHero
          title="Belum ada notifikasi"
          description="Order selesai, trial, dan alert sistem akan muncul di sini."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pusat notifikasi</h2>
          <p className="text-muted-foreground">
            {items.filter((i) => !i.readAt).length} belum dibaca
          </p>
        </div>
        <Link
          className="text-sm text-primary underline"
          href="/dashboard"
        >
          Kembali ke ringkasan
        </Link>
      </div>
      <NotificationsList initial={items} />
    </div>
  );
}
