"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { formatCurrencyIdr } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2 } from "lucide-react";

type Hit = {
  id: string;
  title: string;
  status: string;
  amount: number;
  updatedAt: string;
  customer: { id: string; name: string; phone: string };
};

export function OrdersRealtimeSearch() {
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 320);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) {
      setItems(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/orders/search?q=${encodeURIComponent(term)}&limit=20`,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? "Gagal mencari");
        }
        if (!cancelled) {
          setItems((data as { items: Hit[] }).items ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal mencari");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari order realtime…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari order"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : null}

      {items && debounced.trim().length >= 2 ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {items.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Tidak ada hasil.</p>
          ) : (
            <ScrollArea className="h-64">
              <ul className="divide-y">
                {items.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/dashboard/orders/${h.id}`}
                      className="block px-3 py-2 text-sm hover:bg-muted/80"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{h.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {ORDER_STATUS_LABEL[h.status as keyof typeof ORDER_STATUS_LABEL] ??
                            h.status}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {h.customer.name} · {h.customer.phone}
                        </span>
                        <span>{formatCurrencyIdr(h.amount)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      ) : null}
    </div>
  );
}
