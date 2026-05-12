"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "@/actions/onboarding-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState({ customers: false, orders: false, billing: false });

  const allChecked = done.customers && done.orders && done.billing;

  function finish() {
    startTransition(async () => {
      const res = await completeOnboardingAction();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Gagal menyimpan" });
        return;
      }
      toast({ title: "Selamat datang di TailorFlow" });
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Onboarding</h2>
        <p className="text-muted-foreground">
          Tandai langkah awal — Anda bisa melewati dan mengisi nanti.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>Interaktif & ringkas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={done.customers}
              onCheckedChange={(v) =>
                setDone((d) => ({ ...d, customers: v === true }))
              }
            />
            Saya mengerti cara menambah pelanggan & ukuran
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={done.orders}
              onCheckedChange={(v) =>
                setDone((d) => ({ ...d, orders: v === true }))
              }
            />
            Saya mengerti alur order & progress jahitan
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={done.billing}
              onCheckedChange={(v) =>
                setDone((d) => ({ ...d, billing: v === true }))
              }
            />
            Saya tahu di mana billing & upgrade paket
          </label>
          <Button disabled={pending || !allChecked} onClick={finish}>
            {pending ? "Menyimpan…" : "Mulai dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
