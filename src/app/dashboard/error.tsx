"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Terjadi kesalahan di dashboard
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Tim Anda tetap aman — coba muat ulang. Jika berlanjut, hubungi support.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Ref: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Coba lagi
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Ke ringkasan</Link>
        </Button>
      </div>
    </div>
  );
}
