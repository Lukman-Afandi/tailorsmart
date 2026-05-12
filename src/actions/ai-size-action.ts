"use server";

import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { requireSessionBusinessId } from "@/lib/tenant";

export type AiSizeResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * PROFESSIONAL: rekomendasi ukuran berbasis aturan (bukan model ML).
 * Siap diganti integrasi model AI tanpa mengubah kontrak response.
 */
export async function recommendSizeFromMeasurementsAction(
  measurements: Record<string, string | undefined>,
): Promise<AiSizeResult> {
  const businessId = await requireSessionBusinessId();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });

  if (!PLAN_LIMITS[business.plan].aiSizeRecommendation) {
    return {
      ok: false,
      error: "Fitur AI rekomendasi ukuran tersedia di paket Professional.",
    };
  }

  const dada = Number(measurements.dada?.replace(",", "."));
  const pinggang = Number(measurements.pinggang?.replace(",", "."));
  const tinggi = Number(measurements.tinggiBadan?.replace(",", "."));

  const parts: string[] = [];

  if (Number.isFinite(dada) && dada > 0) {
    if (dada < 90) parts.push("Lingkar dada relatif kecil — pertimbangkan pola slim fit.");
    else if (dada > 110) parts.push("Lingkar dada besar — pastikan ruang gerak lengan dan kancing.");
    else parts.push("Lingkar dada dalam rentang umum — pola reguler biasanya pas.");
  }

  if (Number.isFinite(pinggang) && Number.isFinite(dada) && pinggang > 0 && dada > 0) {
    const ratio = dada - pinggang;
    if (ratio > 18) parts.push("Selisih dada–pinggang besar — siluet lebih taper mungkin lebih nyaman.");
    if (ratio < 8) parts.push("Proporsi torso cenderung lurus — kurangi taper agar tidak ketat di pinggang.");
  }

  if (Number.isFinite(tinggi) && tinggi > 0) {
    if (tinggi < 160) parts.push("Tinggi badan di bawah rata-rata — perhatikan panjang baju/celana standar.");
    if (tinggi > 180) parts.push("Tinggi badan tinggi — tambahkan margin panjang pola.");
  }

  if (parts.length === 0) {
    return {
      ok: true,
      text:
        "Lengkapi minimal satu ukuran numerik (mis. dada, pinggang, atau tinggi badan) untuk mendapat rekomendasi lebih spesifik.",
    };
  }

  return {
    ok: true,
    text: parts.join(" "),
  };
}
