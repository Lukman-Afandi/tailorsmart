"use server";

import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionBusinessId } from "@/lib/tenant";

export type AiBizResult =
  | { ok: true; repeatScore: number; report: string }
  | { ok: false; error: string };

/**
 * Heuristik AI ringan (tanpa API key) — siap diganti OpenAI / model internal.
 */
export async function runAiBusinessInsightsAction(): Promise<AiBizResult> {
  const businessId = await requireSessionBusinessId();

  const [customers, ordersLast90] = await Promise.all([
    prisma.customer.count({ where: { businessId } }),
    prisma.order.findMany({
      where: {
        businessId,
        createdAt: { gte: new Date(Date.now() - 90 * 86400000) },
      },
      select: { customerId: true, status: true },
    }),
  ]);

  const byCustomer = new Map<string, { total: number; completed: number }>();
  for (const o of ordersLast90) {
    const cur = byCustomer.get(o.customerId) ?? { total: 0, completed: 0 };
    cur.total += 1;
    if (o.status === OrderStatus.COMPLETED || o.status === OrderStatus.PICKED_UP) {
      cur.completed += 1;
    }
    byCustomer.set(o.customerId, cur);
  }

  let repeatCandidates = 0;
  for (const v of byCustomer.values()) {
    if (v.total >= 2 && v.completed >= 1) repeatCandidates += 1;
  }

  const repeatScore = customers === 0 ? 0 : Math.min(100, Math.round((repeatCandidates / customers) * 100));

  const report = [
    `Pelanggan aktif: ${customers}`,
    `Order 90 hari: ${ordersLast90.length}`,
    `Indikasi repeat order: ${repeatScore}% (pelanggan dengan ≥2 order & pernah selesai).`,
    `Rekomendasi: follow-up pelanggan repeat dengan paket bundle / diskon musiman.`,
  ].join("\n");

  return { ok: true, repeatScore, report };
}
