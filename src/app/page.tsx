import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              TF
            </div>
            <span className="font-semibold">TailorFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/pricing">Harga</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Daftar bisnis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Multi-tenant · PostgreSQL · Auth aman
              </p>
              <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
                Operasikan bengkel jahit seperti{" "}
                <span className="text-primary">SaaS modern</span>
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
                Kelola pelanggan, ukuran badan, riwayat order, dan pemasukan —
                terisolasi per bisnis, siap skala, dan nyaman di mobile.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Mulai gratis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sudah punya akun</Link>
                </Button>
              </div>
              <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                {[
                  "Data antar tenant tidak bercampur",
                  "Pencarian pelanggan cepat + pagination",
                  "Mode gelap & UI komponen reusable",
                  "Siap deploy Vercel + Cloudinary",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="border-primary/20 shadow-lg shadow-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  Cuplikan dashboard
                </CardTitle>
                <CardDescription>
                  Statistik, order aktif, dan pemasukan bulanan dalam satu layar.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Pelanggan</p>
                    <p className="text-2xl font-semibold">128</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Order aktif</p>
                    <p className="text-2xl font-semibold">14</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Pemasukan bulan ini
                  </p>
                  <p className="text-2xl font-semibold">Rp12.450.000</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Pencarian debounce + tabel modern dengan skeleton loading.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Paket yang fleksibel
              </h2>
              <p className="mt-2 text-muted-foreground">
                FREE untuk mulai, BASIC untuk ekspor & reminder, PROFESSIONAL
                untuk tim dan analitik mendalam.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>FREE</CardTitle>
                  <CardDescription>Mulai tanpa kartu kredit</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-2">
                    <li>Maks. 30 pelanggan</li>
                    <li>Maks. 20 order / bulan</li>
                    <li>Tanpa ekspor data</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-primary/40">
                <CardHeader>
                  <CardTitle>BASIC</CardTitle>
                  <CardDescription>Untuk bengkel yang mulai rame</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-2">
                    <li>Maks. 500 pelanggan</li>
                    <li>Export PDF & Excel</li>
                    <li>Reminder pelanggan</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>PROFESSIONAL</CardTitle>
                  <CardDescription>Skala & multi pegawai</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-2">
                    <li>Pelanggan unlimited</li>
                    <li>Multi pegawai & analitik lengkap</li>
                    <li>AI rekomendasi ukuran</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <Shield className="h-10 w-10 text-primary" />
              <div>
                <h3 className="text-xl font-semibold">Keamanan tenant-first</h3>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Setiap query di-scope ke `businessId` dari sesi. Middleware
                  melindungi area dashboard; server actions memvalidasi ulang
                  kepemilikan data.
                </p>
              </div>
            </div>
            <Button asChild size="lg">
              <Link href="/register">Buka akun demo Anda</Link>
            </Button>
          </div>
        </section>

        <footer className="border-t py-10">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} TailorFlow</p>
            <div className="flex gap-4">
              <Link className="hover:text-foreground" href="/login">
                Login
              </Link>
              <Link className="hover:text-foreground" href="/register">
                Register
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
