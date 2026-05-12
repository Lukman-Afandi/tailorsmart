"use client";

import Link from "next/link";
import { isPast, isToday, isTomorrow } from "date-fns";
import type { OrderPriority, OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ORDER_PRIORITY_LABEL } from "@/lib/enterprise-labels";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarClock } from "lucide-react";

type Row = {
  id: string;
  title: string;
  status: OrderStatus;
  priority: OrderPriority;
  stitchDeadlineAt: string | null;
  estimatedCompletionAt: string | null;
  customer: { name: string; phone: string };
};

function bucketLabel(d: Date) {
  if (isToday(d)) return "Hari ini";
  if (isTomorrow(d)) return "Besok";
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ProductionCalendar({ initial }: { initial: Row[] }) {
  const groups = new Map<string, Row[]>();
  for (const o of initial) {
    const raw = o.stitchDeadlineAt ?? o.estimatedCompletionAt;
    if (!raw) continue;
    const day = new Date(raw);
    const key = day.toISOString().slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(o);
    groups.set(key, list);
  }

  const sortedKeys = [...groups.keys()].sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kalender produksi</h2>
        <p className="text-muted-foreground">
          Deadline & estimasi selesai untuk order aktif — prioritas visual untuk floor tailor.
        </p>
      </div>

      {sortedKeys.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Belum ada jadwal</CardTitle>
            <CardDescription>
              Tambahkan deadline atau biarkan sistem mengisi estimasi otomatis saat membuat
              order.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedKeys.map((key) => {
            const day = new Date(`${key}T12:00:00`);
            const items = groups.get(key) ?? [];
            const urgent = items.some((o) => {
              if (!o.stitchDeadlineAt) return false;
              const dd = new Date(o.stitchDeadlineAt);
              return isPast(dd) && !isToday(dd);
            });
            return (
              <Card
                key={key}
                className={cn(
                  "border-border/80 shadow-sm",
                  urgent && "border-amber-500/40 bg-amber-500/[0.03]",
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{bucketLabel(day)}</CardTitle>
                      <CardDescription>{key}</CardDescription>
                    </div>
                  </div>
                  {urgent ? (
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Ada lewat deadline
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((o) => (
                    <Link
                      key={o.id}
                      href={`/dashboard/orders/${o.id}`}
                      className="block rounded-lg border bg-card/60 p-3 transition hover:border-primary/40 hover:bg-card"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{o.title}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">{ORDER_STATUS_LABEL[o.status]}</Badge>
                          <Badge variant="secondary">
                            {ORDER_PRIORITY_LABEL[o.priority]}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {o.customer.name} · {o.customer.phone}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {o.stitchDeadlineAt
                          ? `Deadline: ${new Date(o.stitchDeadlineAt).toLocaleString("id-ID")}`
                          : null}
                        {o.stitchDeadlineAt && o.estimatedCompletionAt ? " · " : ""}
                        {o.estimatedCompletionAt
                          ? `Estimasi: ${new Date(o.estimatedCompletionAt).toLocaleString("id-ID")}`
                          : null}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
