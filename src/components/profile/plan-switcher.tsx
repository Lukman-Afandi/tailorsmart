"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SubscriptionPlan } from "@prisma/client";
import { updateBusinessPlanAction } from "@/actions/business-actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function PlanSwitcher({ current }: { current: SubscriptionPlan }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setPlan(plan: SubscriptionPlan) {
    startTransition(async () => {
      await updateBusinessPlanAction(plan);
      toast({ title: "Paket diperbarui (demo)" });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(
        [
          { id: "FREE" as const, label: "FREE" },
          { id: "BASIC" as const, label: "BASIC" },
          { id: "PROFESSIONAL" as const, label: "PROFESSIONAL" },
        ] as const
      ).map((p) => (
        <Button
          key={p.id}
          type="button"
          size="sm"
          variant={current === p.id ? "default" : "outline"}
          disabled={pending || current === p.id}
          onClick={() => setPlan(p.id)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
