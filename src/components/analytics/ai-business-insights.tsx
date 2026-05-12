"use client";

import { useTransition } from "react";
import { runAiBusinessInsightsAction } from "@/actions/ai-business-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function AiBusinessInsights({ enabled }: { enabled: boolean }) {
  const [text, setText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="border-dashed border-primary/30 bg-muted/20">
      <CardHeader>
        <CardTitle>AI laporan bisnis & prediksi repeat</CardTitle>
        <CardDescription>
          Heuristik on-tenant (tanpa kirim data ke pihak ketiga). Ganti dengan model LLM
          jika `OPENAI_API_KEY` tersedia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          disabled={!enabled || pending}
          onClick={() => {
            startTransition(async () => {
              const res = await runAiBusinessInsightsAction();
              if (!res.ok) {
                toast({
                  variant: "destructive",
                  title: "Gagal",
                  description: res.error,
                });
                return;
              }
              setText(res.report);
              setScore(res.repeatScore);
              toast({ title: "Insight siap" });
            });
          }}
        >
          {pending ? "Menganalisis…" : "Generate laporan"}
        </Button>
        {score !== null ? (
          <p className="text-sm text-muted-foreground">
            Skor repeat order (0–100):{" "}
            <span className="font-semibold text-foreground">{score}</span>
          </p>
        ) : null}
        {text ? (
          <Textarea readOnly rows={6} value={text} className="font-mono text-xs" />
        ) : null}
      </CardContent>
    </Card>
  );
}
