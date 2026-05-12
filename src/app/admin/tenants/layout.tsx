import { redirect } from "next/navigation";
import { getPlatformAdminFromSession } from "@/lib/platform-admin-session";

export default async function AdminTenantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getPlatformAdminFromSession();
  if (!admin) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
