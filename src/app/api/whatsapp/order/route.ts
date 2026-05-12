import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const querySchema = z.object({
  orderId: z.string().min(1),
  kind: z.enum(["complete", "update"]).default("complete"),
});

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function GET(request: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(
    getRequestLimiterKey(request, userId, "whatsapp-order"),
    60,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    orderId: searchParams.get("orderId") ?? "",
    kind: searchParams.get("kind") ?? "complete",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter tidak valid" },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, businessId },
    include: {
      customer: true,
      business: { select: { name: true, phone: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const wa = digitsOnly(order.customer.phone);
  if (wa.length < 9) {
    return NextResponse.json(
      { error: "Nomor WhatsApp pelanggan tidak valid" },
      { status: 400 },
    );
  }

  const text =
    parsed.data.kind === "complete"
      ? `Halo ${order.customer.name}, order "${order.title}" di ${order.business.name} sudah selesai dan siap diambil. Terima kasih!`
      : `Halo ${order.customer.name}, kami informasikan status order "${order.title}" saat ini: ${ORDER_STATUS_LABEL[order.status]}. — ${order.business.name}`;

  const url = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;

  return NextResponse.json(
    { url, message: text },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
