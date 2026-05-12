import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { PLAN_LIMITS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestLimiterKey } from "@/lib/rate-limit";
import { effectivePlanForLimits } from "@/lib/subscription-state";
import {
  countAttachmentsForOrder,
  countOrderAttachmentsThisMonth,
} from "@/lib/upload-usage";
import { orderUploadFormSchema } from "@/lib/validations/upload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const userId = session?.user?.id;
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(
    getRequestLimiterKey(req, userId, "upload-order"),
    30,
    60_000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak unggahan" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const orderId = form.get("orderId");
  const type = form.get("type");

  const meta = orderUploadFormSchema.safeParse({
    orderId: typeof orderId === "string" ? orderId : "",
    type: typeof type === "string" ? type : "",
  });
  if (!meta.success) {
    return NextResponse.json(
      { error: "Metadata tidak valid", details: meta.error.flatten() },
      { status: 400 },
    );
  }

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "File tidak valid" }, { status: 400 });
  }

  const mime = file.type;
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Hanya gambar yang didukung" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: meta.data.orderId, businessId },
  });
  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
  });
  const limitsPlan = effectivePlanForLimits(business);
  const planLimits = PLAN_LIMITS[limitsPlan];
  const [monthCount, orderAttachCount] = await Promise.all([
    countOrderAttachmentsThisMonth(businessId),
    countAttachmentsForOrder(order.id),
  ]);
  if (
    planLimits.maxOrderUploadsPerMonth !== null &&
    monthCount >= planLimits.maxOrderUploadsPerMonth
  ) {
    return NextResponse.json(
      {
        error: `Kuota unggahan bulanan (${planLimits.maxOrderUploadsPerMonth}) untuk paket ini sudah penuh.`,
      },
      { status: 403 },
    );
  }
  if (
    planLimits.maxAttachmentsPerOrder !== null &&
    orderAttachCount >= planLimits.maxAttachmentsPerOrder
  ) {
    return NextResponse.json(
      {
        error: `Maksimal ${planLimits.maxAttachmentsPerOrder} lampiran per order pada paket Anda.`,
      },
      { status: 403 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Maksimal 6MB" }, { status: 400 });
  }

  const isPng =
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47;
  const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8;
  const isGif =
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46;
  const isWebp =
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP";
  if (!isPng && !isJpeg && !isGif && !isWebp) {
    return NextResponse.json(
      { error: "Format gambar tidak dikenali (PNG, JPEG, GIF, WebP)." },
      { status: 400 },
    );
  }

  try {
    const uploaded = await uploadBufferToCloudinary(
      buf,
      `tailorflow/orders/${businessId}`,
      `${order.id}-${meta.data.type}`,
    );

    const row = await prisma.orderAttachment.create({
      data: {
        orderId: order.id,
        type: meta.data.type,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      },
    });

    return NextResponse.json({
      id: row.id,
      url: row.url,
      type: row.type,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
