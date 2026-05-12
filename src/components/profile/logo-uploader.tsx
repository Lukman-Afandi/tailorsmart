"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function LogoUploader({
  logoUrl,
  businessName,
}: {
  logoUrl: string | null;
  businessName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(logoUrl);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-20 w-20 overflow-hidden rounded-xl border bg-muted">
        {preview ? (
          <Image
            src={preview}
            alt={businessName}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
            TF
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Logo bisnis</p>
        <p className="text-sm text-muted-foreground">
          Unggah ke Cloudinary via API route (pastikan env Cloudinary terisi).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} asChild>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  startTransition(async () => {
                    const fd = new FormData();
                    fd.set("file", file);
                    const res = await fetch("/api/upload/logo", {
                      method: "POST",
                      body: fd,
                    });
                    const data = (await res.json()) as {
                      url?: string;
                      error?: string;
                    };
                    if (!res.ok) {
                      toast({
                        variant: "destructive",
                        title: "Upload gagal",
                        description: data.error ?? "Coba lagi",
                      });
                      return;
                    }
                    if (data.url) setPreview(data.url);
                    toast({ title: "Logo diperbarui" });
                    router.refresh();
                  });
                }}
              />
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {pending ? "Mengunggah…" : "Pilih gambar"}
              </span>
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
}
