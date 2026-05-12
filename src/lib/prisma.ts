import { PrismaClient } from "@prisma/client";

/**
 * Satu instance Prisma per proses server — hindari N+1 dengan `select`/`include`
 * minimal, indeks di schema, dan `unstable_cache` untuk agregasi dashboard.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
