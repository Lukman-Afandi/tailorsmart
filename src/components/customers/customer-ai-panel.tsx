"use client";

import { useTransition } from "react";
import type { SubscriptionPlan } from "@prisma/client";
import { recommendSizeFromMeasurementsAction } from "@/actions/ai-size-action";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function CustomerAiPanel({
  plan,
  measurements,
}: {
  plan: SubscriptionPlan;
  measurements: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const enabled = PLAN_LIMITS[plan].aiSizeRecommendation;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI rekomendasi ukuran</CardTitle>
        <CardDescription>
          {enabled
            ? "Heuristik produksi (siap diganti model ML) berdasarkan ukuran yang tersimpan."
            : "Upgrade ke paket PROFESSIONAL untuk mengaktifkan rekomendasi."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          disabled={!enabled || pending}
          onClick={() => {
            startTransition(async () => {
              const res = await recommendSizeFromMeasurementsAction(measurements);
              if (!res.ok) {
                toast({
                  variant: "destructive",
                  title: "Tidak bisa memproses",
                  description: res.error,
                });
                return;
              }
              toast({
                title: "Rekomendasi",
                description: res.text,
              });
            });
          }}
        >
          {pending ? "Menganalisis…" : "Generate rekomendasi"}
        </Button>
        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            Fitur ini bagian dari paket PROFESSIONAL.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
