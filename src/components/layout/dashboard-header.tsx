"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DashboardMobileNav } from "@/components/layout/dashboard-nav";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Bell } from "lucide-react";

export function DashboardHeader({
  businessName,
  logoUrl,
}: {
  businessName: string;
  logoUrl: string | null;
}) {
  const { data } = useSession();

  const initial =
    data?.user?.name?.slice(0, 2).toUpperCase() ??
    data?.user?.email?.slice(0, 2).toUpperCase() ??
    "TF";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-w-0 items-center gap-2">
        <DashboardMobileNav businessName={businessName} logoUrl={logoUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{businessName}</p>
          <h1 className="truncate text-base font-semibold leading-tight">
            Dashboard
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <CommandPalette />
        <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
          <Link href="/dashboard/notifications" aria-label="Notifikasi">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[140px] truncate text-sm sm:inline">
                {data?.user?.name ?? data?.user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {data?.user?.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {data?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              Akun
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
