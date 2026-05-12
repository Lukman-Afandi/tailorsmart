"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import type { SubscriptionPlan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function CustomersToolbar({
  businessPlan,
  initialQuery,
  exportEnabled,
}: {
  businessPlan: SubscriptionPlan;
  initialQuery: string;
  exportEnabled: { pdf: boolean; excel: boolean };
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  function scheduleNavigate(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (next) params.set("q", next);
      params.set("page", "1");
      router.replace(`/dashboard/customers?${params.toString()}`);
    }, 400);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari nama atau nomor HP…"
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            scheduleNavigate(v.trim());
          }}
          aria-label="Cari pelanggan"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{businessPlan}</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!exportEnabled.pdf}
          onClick={() => {
            if (!exportEnabled.pdf) {
              toast({
                title: "Tidak tersedia",
                description: "Export PDF aktif mulai paket BASIC.",
              });
              return;
            }
            window.open("/api/export/customers/pdf", "_blank");
          }}
        >
          <Download className="h-4 w-4" />
          PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!exportEnabled.excel}
          onClick={() => {
            if (!exportEnabled.excel) {
              toast({
                title: "Tidak tersedia",
                description: "Export Excel aktif mulai paket BASIC.",
              });
              return;
            }
            window.open("/api/export/customers/excel", "_blank");
          }}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </Button>
      </div>
    </div>
  );
}
