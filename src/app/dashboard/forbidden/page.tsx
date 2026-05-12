import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Akses ditolak",
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldOff className="h-6 w-6 text-destructive" aria-hidden />
          </div>
          <CardTitle className="text-xl">403 — Akses ditolak</CardTitle>
          <CardDescription className="text-base">
            Peran Anda tidak memiliki izin untuk halaman ini. Hubungi pemilik
            bisnis jika menurut Anda ini kesalahan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="default">
            <Link href="/dashboard">Kembali ke ringkasan</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/orders">Lihat order</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
