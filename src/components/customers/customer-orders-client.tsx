"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { SubscriptionPlan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";

export function CustomerOrdersClient({
  businessPlan,
  customerId,
  customers,
}: {
  businessPlan: SubscriptionPlan;
  customerId: string;
  customers: { id: string; name: string; phone: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex shrink-0 gap-2">
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Order untuk pelanggan ini
      </Button>

      <OrderFormDialog
        open={open}
        onOpenChange={setOpen}
        businessPlan={businessPlan}
        customers={customers}
        defaultCustomerId={customerId}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
