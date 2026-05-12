"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Terjadi kesalahan</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Silakan coba lagi. Jika masalah berlanjut, hubungi administrator.
      </p>
      <div className="flex gap-2">
        <Button type="button" onClick={() => reset()}>
          Coba lagi
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Ke beranda</Link>
        </Button>
      </div>
    </div>
  );
}
