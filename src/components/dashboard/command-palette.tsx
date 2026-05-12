"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Command } from "cmdk";
import {
  dashboardNavItems,
  filterNavForRole,
} from "@/lib/dashboard-nav";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const navItems = useMemo(() => {
    const role = session?.user?.role;
    return role ? filterNavForRole(role) : dashboardNavItems;
  }, [session?.user?.role]);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [toggle]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "hidden items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground md:inline-flex",
        )}
      >
        Cari…
        <kbd className="pointer-events-none rounded border bg-background px-1 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Navigasi cepat</DialogTitle>
          <Command className="rounded-lg border-none shadow-none">
            <Command.Input
              placeholder="Ke halaman…"
              className="flex h-11 w-full border-b bg-transparent px-3 text-sm outline-none"
            />
            <Command.List className="max-h-72 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada hasil.
              </Command.Empty>
              <Command.Group heading="Menu" className="px-1 py-1 text-xs text-muted-foreground">
                {navItems.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.href}`}
                    className="flex cursor-pointer select-none rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted"
                    onSelect={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
