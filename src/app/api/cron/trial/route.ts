import { NextResponse } from "next/server";
import { TenantSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyTenant } from "@/services/notification.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  const vercel = request.headers.get("x-vercel-cron");
  if (vercel === "1") return true;
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.business.findMany({
    where: {
      subscriptionStatus: TenantSubscriptionStatus.TRIALING,
      trialEndsAt: { lte: now },
    },
    select: { id: true, name: true },
  });

  for (const b of expired) {
    await notifyTenant({
      businessId: b.id,
      title: "Trial berakhir",
      body: `Paket fitur kembali mengikuti langganan aktif. Terima kasih telah mencoba TailorFlow, ${b.name}.`,
    });
  }

  const updated = await prisma.business.updateMany({
    where: {
      subscriptionStatus: TenantSubscriptionStatus.TRIALING,
      trialEndsAt: { lte: now },
    },
    data: { subscriptionStatus: TenantSubscriptionStatus.ACTIVE },
  });

  logger.info("cron.trial_tick", { expired: expired.length, updated: updated.count });
  return NextResponse.json({ ok: true, processed: expired.length });
}
