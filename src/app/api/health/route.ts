import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Health check untuk load balancer / orchestrator (tanpa data sensitif). */
export async function GET() {
  const started = Date.now();
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const latencyMs = Date.now() - started;
  const status = dbOk ? 200 : 503;
  return NextResponse.json(
    {
      ok: dbOk,
      service: "tailorflow",
      db: dbOk ? "up" : "down",
      latencyMs,
    },
    { status },
  );
}
