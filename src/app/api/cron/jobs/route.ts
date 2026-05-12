import { NextResponse } from "next/server";
import {
  claimNextJobs,
  enqueueJob,
  markJobDone,
  markJobFailed,
} from "@/services/queue.service";
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

  const jobs = await claimNextJobs(10);
  let ok = 0;
  for (const job of jobs) {
    try {
      if (job.type === "BACKUP_LOG") {
        logger.info("queue.backup_log", {
          jobId: job.id,
          payload: job.payload,
        });
      } else if (job.type === "AI_REPORT") {
        logger.info("queue.ai_report", { jobId: job.id });
      } else {
        logger.warn("queue.unknown_type", { type: job.type });
      }
      await markJobDone(job.id);
      ok += 1;
    } catch (e) {
      await markJobFailed(
        job.id,
        e instanceof Error ? e.message : "job error",
        120,
      );
    }
  }

  return NextResponse.json({ ok: true, processed: ok, pending: jobs.length });
}

/** Enqueue backup audit (panggil dari Vercel cron harian). */
export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const j = await enqueueJob("BACKUP_LOG", {
    note: "Konfigurasi pg_dump / managed backup harus di infra terpisah.",
    at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, jobId: j.id });
}
