import { CustomersToolbar } from "@/components/customers/customers-toolbar";
import { CustomersTable } from "@/components/customers/customers-table";
import type { SubscriptionPlan } from "@prisma/client";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  createdAt: Date;
};

export function CustomersSection({
  businessPlan,
  initialQuery,
  initialPage,
  pageSize,
  total,
  totalPages,
  rows,
  exportEnabled,
  remindersEnabled,
}: {
  businessPlan: SubscriptionPlan;
  initialQuery: string;
  initialPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: CustomerRow[];
  exportEnabled: { pdf: boolean; excel: boolean };
  remindersEnabled: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pelanggan</h2>
        <p className="text-muted-foreground">
          Kelola database pelanggan — pencarian debounce & pagination.
        </p>
      </div>

      <CustomersToolbar
        businessPlan={businessPlan}
        initialQuery={initialQuery}
        exportEnabled={exportEnabled}
      />

      <CustomersTable
        initialRows={rows}
        initialQuery={initialQuery}
        initialPage={initialPage}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        remindersEnabled={remindersEnabled}
      />
    </div>
  );
}
