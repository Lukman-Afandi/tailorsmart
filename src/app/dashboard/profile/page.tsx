import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/profile/profile-form";
import { LogoUploader } from "@/components/profile/logo-uploader";
import { PlanSwitcher } from "@/components/profile/plan-switcher";

export const metadata: Metadata = {
  title: "Profil bisnis",
};

export default async function ProfilePage() {
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) return null;

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const limits = PLAN_LIMITS[business.plan];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profil bisnis</h2>
        <p className="text-muted-foreground">
          Logo, kontak, dan paket langganan — perubahan langsung memengaruhi limit fitur.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identitas</CardTitle>
          <CardDescription>Nama bisnis dan kontak utama</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUploader logoUrl={business.logoUrl} businessName={business.name} />
          <Separator />
          <ProfileForm
            defaultValues={{
              name: business.name,
              phone: business.phone ?? "",
              address: business.address ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paket & fitur</CardTitle>
          <CardDescription>
            Demo: ubah paket untuk menguji limit (integrasikan gateway pembayaran di
            produksi).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PlanSwitcher current={business.plan} />

          <div className="grid gap-2 text-sm">
            <p className="font-medium">Aktif saat ini</p>
            <ul className="grid gap-1 text-muted-foreground">
              <li>
                Maks pelanggan:{" "}
                {limits.maxCustomers === null ? "∞" : limits.maxCustomers}
              </li>
              <li>
                Maks order/bulan:{" "}
                {limits.maxOrdersPerMonth === null
                  ? "∞"
                  : limits.maxOrdersPerMonth}
              </li>
              <li>Export PDF: {limits.exportPdf ? "ya" : "tidak"}</li>
              <li>Export Excel: {limits.exportExcel ? "ya" : "tidak"}</li>
              <li>Reminder: {limits.reminders ? "ya" : "tidak"}</li>
              <li>Multi pegawai: {limits.multiStaff ? "ya" : "tidak"}</li>
              <li>Analitik lengkap: {limits.fullAnalytics ? "ya" : "tidak"}</li>
              <li>AI ukuran: {limits.aiSizeRecommendation ? "ya" : "tidak"}</li>
              <li>Prioritas support: {limits.prioritySupport ? "ya" : "tidak"}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
