"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STORAGE_KEY = "tailorflow_tutorial_dismissed_v1";

export function DashboardTips() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(!window.localStorage.getItem(STORAGE_KEY));
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <Card className="border-primary/25 bg-gradient-to-r from-primary/10 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Tutorial singkat</CardTitle>
          <CardDescription>
            ⌘K command palette · Billing untuk paket · Notifikasi di header.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Tutup"
          onClick={() => {
            try {
              window.localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setOpen(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Gunakan kalender produksi untuk deadline floor tailor. Export data lengkap dari
        menu Billing / API export.
      </CardContent>
    </Card>
  );
}
