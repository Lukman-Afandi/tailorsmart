"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/password-reset-actions";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Lupa password</CardTitle>
          <CardDescription>
            Kami kirim tautan reset (Resend) jika email terdaftar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await requestPasswordResetAction({ email });
                if (!res.ok) {
                  toast({
                    variant: "destructive",
                    title: "Gagal",
                    description: res.error,
                  });
                  return;
                }
                toast({
                  title: "Periksa email",
                  description: "Jika email valid, tautan reset telah dikirim.",
                });
              });
            }}
          >
            {pending ? "Mengirim…" : "Kirim tautan"}
          </Button>
          <Button variant="link" className="w-full" asChild>
            <Link href="/login">Kembali ke login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
