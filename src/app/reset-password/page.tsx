"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/password-reset-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Token tidak ada.{" "}
        <Link className="underline" href="/forgot-password">
          Minta ulang
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="pw">Password baru</Label>
        <Input
          id="pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button
        className="w-full"
        disabled={pending || password.length < 8}
        onClick={() => {
          startTransition(async () => {
            const res = await resetPasswordAction({ token, password });
            if (!res.ok) {
              toast({
                variant: "destructive",
                title: "Gagal",
                description: res.error,
              });
              return;
            }
            toast({ title: "Password diperbarui" });
            window.location.href = "/login";
          });
        }}
      >
        {pending ? "Menyimpan…" : "Simpan password"}
      </Button>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Minimal 8 karakter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat…</p>}>
            <ResetForm />
          </Suspense>
          <Button variant="link" className="w-full" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
