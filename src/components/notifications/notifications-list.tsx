"use client";

import { useRouter } from "next/navigation";
import { markNotificationReadAction } from "@/actions/notification-actions";
import { Button } from "@/components/ui/button";

export function NotificationsList({
  initial,
}: {
  initial: {
    id: string;
    title: string;
    body: string;
    readAt: Date | null;
    createdAt: Date;
  }[];
}) {
  const router = useRouter();

  return (
    <ul className="space-y-2">
      {initial.map((n) => (
        <li
          key={n.id}
          className="flex flex-col gap-2 rounded-xl border bg-card/60 p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <p className="font-medium">{n.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(n.createdAt).toLocaleString("id-ID")}
            </p>
          </div>
          {!n.readAt ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await markNotificationReadAction(n.id);
                router.refresh();
              }}
            >
              Tandai dibaca
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Dibaca</span>
          )}
        </li>
      ))}
    </ul>
  );
}
