import type { Metadata } from "next";
import { AuditLogPanel } from "@/components/audit/audit-log-panel";
import { Permission } from "@/lib/permissions";
import { requirePermission } from "@/lib/role-guard";

export const metadata: Metadata = {
  title: "Audit log",
};

export default async function AuditPage() {
  await requirePermission(Permission.AUDIT_VIEW);
  return <AuditLogPanel />;
}
