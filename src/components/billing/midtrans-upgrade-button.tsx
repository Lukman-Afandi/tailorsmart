"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaidSubscriptionPlan } from "@/lib/billing/plan-pricing";
import { midtransSnapScriptUrlForClient } from "@/lib/midtrans-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type CreateTxResponse = {
  token: string;
  clientKey: string;
  isProduction: boolean;
};

function loadSnapScript(
  clientKey: string,
  isProduction: boolean,
): Promise<void> {
  const src = midtransSnapScriptUrlForClient(isProduction);
  const existing = document.querySelector(`script[data-midtrans-snap="${src}"]`);
  if (existing && window.snap) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);
    script.setAttribute("data-midtrans-snap", src);
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Gagal memuat skrip pembayaran Midtrans."));
    document.body.appendChild(script);
  });
}

export function MidtransUpgradeButton({
  plan,
  disabled,
  label = "Bayar & aktifkan",
}: {
  plan: PaidSubscriptionPlan;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const payingRef = useRef(false);

  const startCheckout = useCallback(async () => {
    if (payingRef.current) return;
    payingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/billing/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | CreateTxResponse
        | { error?: string };

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Checkout gagal",
          description:
            "error" in data && data.error
              ? data.error
              : `HTTP ${res.status}`,
        });
        return;
      }

      const { token, clientKey, isProduction } = data as CreateTxResponse;
      if (!token || !clientKey) {
        toast({
          variant: "destructive",
          title: "Respons tidak valid",
          description: "Token pembayaran tidak diterima.",
        });
        return;
      }

      await loadSnapScript(clientKey, isProduction);

      if (!window.snap?.pay) {
        toast({
          variant: "destructive",
          title: "Snap tidak tersedia",
          description: "Muat ulang halaman dan coba lagi.",
        });
        return;
      }

      window.snap.pay(token, {
        onSuccess: () => {
          toast({
            title: "Pembayaran berhasil",
            description:
              "Langganan akan aktif setelah konfirmasi dari Midtrans (beberapa detik).",
          });
          router.refresh();
        },
        onPending: () => {
          toast({
            title: "Menunggu pembayaran",
            description:
              "Selesaikan pembayaran Anda. Status akan diperbarui otomatis.",
          });
          router.refresh();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Pembayaran gagal",
            description: "Coba lagi atau gunakan metode lain.",
          });
        },
        onClose: () => {
          router.refresh();
        },
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Terjadi kesalahan",
        description:
          e instanceof Error ? e.message : "Tidak dapat memulai pembayaran.",
      });
    } finally {
      setLoading(false);
      payingRef.current = false;
    }
  }, [plan, router]);

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled || loading}
      onClick={() => void startCheckout()}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Memproses…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
