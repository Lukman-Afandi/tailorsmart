import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "File tidak valid" }, { status: 400 });
  }

  const mime = file.type;
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Hanya gambar yang didukung" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Maksimal 4MB" }, { status: 400 });
  }

  try {
    const uploaded = await uploadBufferToCloudinary(
      buf,
      "tailorflow/logos",
      businessId,
    );

    await prisma.business.update({
      where: { id: businessId },
      data: { logoUrl: uploaded.secure_url },
    });

    return NextResponse.json({ url: uploaded.secure_url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
