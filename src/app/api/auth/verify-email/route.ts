import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function loginUrl(q: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(`/login?${q}`, base);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email")?.toLowerCase();
  if (!token || !email) {
    return NextResponse.redirect(loginUrl("verified=0"));
  }

  const row = await prisma.verificationToken.findFirst({
    where: { identifier: email, token },
  });
  if (!row || row.expires < new Date()) {
    logger.warn("verify_email.invalid_or_expired", { email });
    return NextResponse.redirect(loginUrl("verified=0"));
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: email, token },
    }),
  ]);

  logger.info("verify_email.ok", { email });
  return NextResponse.redirect(loginUrl("verified=1"));
}
