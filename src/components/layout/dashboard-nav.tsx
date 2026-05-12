"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dashboardNavItems,
  filterNavForRole,
} from "@/lib/dashboard-nav";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/** @deprecated gunakan dashboardNavItems + filterNavForRole */
export const dashboardNav = dashboardNavItems;

export function DashboardNavLinks({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const items = role ? filterNavForRole(role) : dashboardNavItems;

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebarBrand({
  businessName,
  logoUrl,
}: {
  businessName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-4">
      <div className="relative h-10 w-10 overflow-hidden rounded-lg border bg-muted">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={businessName}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
            TF
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">
          {businessName}
        </p>
        <p className="text-xs text-muted-foreground">TailorFlow</p>
      </div>
    </div>
  );
}

export function DashboardDesktopSidebar({
  businessName,
  logoUrl,
}: {
  businessName: string;
  logoUrl: string | null;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card/30 lg:flex lg:flex-col">
      <DashboardSidebarBrand businessName={businessName} logoUrl={logoUrl} />
      <Separator />
      <ScrollArea className="flex-1 py-4">
        <DashboardNavLinks />
      </ScrollArea>
    </aside>
  );
}

export function DashboardMobileNav({
  businessName,
  logoUrl,
}: {
  businessName: string;
  logoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-full flex-col">
          <DashboardSidebarBrand businessName={businessName} logoUrl={logoUrl} />
          <Separator />
          <ScrollArea className="flex-1 py-4">
            <DashboardNavLinks onNavigate={() => setOpen(false)} />
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
