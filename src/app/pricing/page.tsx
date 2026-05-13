import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { SubscriptionPricingCards } from "@/components/billing/subscription-pricing-cards";

export const metadata: Metadata = {
  title: "Harga",
  description:
    "Paket TailorFlow: Free, Basic, dan Professional untuk bengkel jahit modern.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              TF
            </span>
            TailorFlow
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Daftar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Harga transparan untuk bisnis tailor
          </h1>
          <p className="mt-3 text-muted-foreground md:text-lg">
            Mulai gratis, lalu naikkan paket saat order dan pelanggan Anda tumbuh.
            Pembayaran paket berbayar aman melalui Midtrans.
          </p>
        </div>

        <div className="mt-12">
          <SubscriptionPricingCards variant="marketing" />
        </div>
      </main>
    </div>
  );
}
