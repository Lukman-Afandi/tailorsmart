import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function enqueueJob(type: string, payload?: unknown) {
  const job = await prisma.backgroundJob.create({
    data: {
      type,
      payload: payload === undefined ? undefined : (payload as object),
      status: "PENDING",
    },
  });
  logger.info("queue.job_enqueued", { id: job.id, type });
  return job;
}

export async function claimNextJobs(limit = 5) {
  return prisma.backgroundJob.findMany({
    where: {
      status: "PENDING",
      runAfter: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function markJobDone(id: string) {
  await prisma.backgroundJob.update({
    where: { id },
    data: { status: "DONE", lastError: null },
  });
}

export async function markJobFailed(id: string, err: string, backoffSec = 60) {
  const j = await prisma.backgroundJob.findUnique({ where: { id } });
  if (!j) return;
  await prisma.backgroundJob.update({
    where: { id },
    data: {
      status: j.attempts >= 4 ? "DEAD" : "PENDING",
      attempts: { increment: 1 },
      lastError: err.slice(0, 4000),
      runAfter: new Date(Date.now() + backoffSec * 1000),
    },
  });
}
