import type { Metadata } from "next";
import { auth } from "@/auth";
import { Permission } from "@/lib/permissions";
import { PLAN_LIMITS } from "@/lib/plans";
import { roleLabelId } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/role-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Tim",
};

export default async function TeamPage() {
  await requirePermission(Permission.EMPLOYEE_MANAGE);
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) return null;

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  const users = await prisma.user.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const multi = PLAN_LIMITS[business.plan].multiStaff;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tim & peran</h2>
        <p className="text-muted-foreground">
          Multi pegawai aktif pada paket PROFESSIONAL — undangan & RBAC lanjutan
          dapat ditambahkan di sprint berikutnya.
        </p>
      </div>

      {!multi ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Upgrade ke PROFESSIONAL</CardTitle>
            <CardDescription>
              Kelola beberapa akun staf dengan akses ke tenant yang sama.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Anggota saat ini</CardTitle>
          <CardDescription>
            {users.length} pengguna terhubung ke bisnis ini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{u.name ?? u.email}</p>
                <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant={u.role === "OWNER" ? "default" : "secondary"}>
                {roleLabelId(u.role)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
