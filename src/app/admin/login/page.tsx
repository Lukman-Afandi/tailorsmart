"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { platformAdminLoginAction } from "@/actions/platform-admin-actions";
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

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Card className="mx-auto max-w-md border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle>Super admin</CardTitle>
        <CardDescription className="text-zinc-400">
          Monitoring tenant & suspend — terpisah dari akun bisnis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="e">Email</Label>
          <Input
            id="e"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-zinc-700 bg-zinc-950"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p">Password</Label>
          <Input
            id="p"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-zinc-700 bg-zinc-950"
          />
        </div>
        <Button
          className="w-full"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await platformAdminLoginAction({ email, password });
              if (!res.ok) {
                toast({
                  variant: "destructive",
                  title: "Login gagal",
                  description: res.error,
                });
                return;
              }
              router.replace("/admin/tenants");
              router.refresh();
            });
          }}
        >
          {pending ? "Masuk…" : "Masuk"}
        </Button>
      </CardContent>
    </Card>
  );
}
