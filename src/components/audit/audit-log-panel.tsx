"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type Item = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  createdAt: string;
  user: { name: string | null; email: string } | null;
};

export function AuditLogPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next?: string | null, append = false) => {
    const qs = new URLSearchParams({ take: "40" });
    if (next) qs.set("cursor", next);
    const res = await fetch(`/api/audit-log?${qs.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? "Gagal memuat");
    }
    const payload = data as { items: Item[]; nextCursor: string | null };
    setItems((prev) => (append ? [...prev, ...payload.items] : payload.items));
    setCursor(payload.nextCursor);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load(null, false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal memuat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      await load(cursor, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit log</h2>
        <p className="text-muted-foreground">
          Jejak aksi sensitif: export, faktur, revisi, penghapusan — per tenant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat</CardTitle>
          <CardDescription>Diurutkan dari yang terbaru.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
          ) : (
            <>
              <ScrollArea className="h-[480px] pr-3">
                <ul className="space-y-2">
                  {items.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-lg border bg-card/50 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{i.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(i.createdAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {i.resource}
                        {i.resourceId ? ` · ${i.resourceId}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(i.user?.name ?? i.user?.email) ?? "Sistem"}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              {cursor ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Memuat…" : "Muat lebih banyak"}
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
