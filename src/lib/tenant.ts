import "server-only";

import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export class TenantAccessError extends Error {
  constructor(message = "Akses ditolak") {
    super(message);
    this.name = "TenantAccessError";
  }
}

export class TenantOwnershipError extends Error {
  constructor(message = "Data tidak ditemukan atau bukan milik tenant Anda") {
    super(message);
    this.name = "TenantOwnershipError";
  }
}

/** Alias eksplisit untuk guard multi-tenant — sama dengan requireSessionBusinessId. */
export async function requireBusinessAccess(): Promise<string> {
  return requireSessionBusinessId();
}

/** Pastikan entitas milik businessId session — cegah IDOR antar-tenant. */
export async function requireSessionBusinessId(): Promise<string> {
  const session = await auth();
  const businessId = session?.user?.businessId;
  if (!businessId) {
    throw new TenantAccessError("Sesi tidak valid");
  }
  return businessId;
}

export type TenantSession = Omit<Session, "user"> & {
  user: {
    id: string;
    businessId: string;
    role: UserRole;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
};

export async function requireTenantSession(): Promise<TenantSession> {
  const session = await auth();
  const businessId = session?.user?.businessId;
  const id = session?.user?.id;
  const role = session?.user?.role;
  if (!session?.user || !businessId || !id || !role) {
    throw new TenantAccessError("Sesi tidak valid");
  }
  return session as unknown as TenantSession;
}

export async function getBusinessForSession() {
  const businessId = await requireSessionBusinessId();
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      _count: { select: { customers: true, orders: true } },
    },
  });
  if (!business) {
    throw new TenantAccessError("Bisnis tidak ditemukan");
  }
  return business;
}

/** Where clause wajib untuk query per-tenant — gabungkan dengan filter Anda. */
export function tenantWhere(businessId: string): { businessId: string } {
  return { businessId };
}

/** Validasi ID milik tenant — untuk order / customer / invoice. */
export async function validateTenantOwnership(
  resource: "order" | "customer" | "invoice",
  id: string,
  businessId: string,
): Promise<boolean> {
  switch (resource) {
    case "order": {
      const row = await prisma.order.findFirst({
        where: { id, businessId },
        select: { id: true },
      });
      return !!row;
    }
    case "customer": {
      const row = await prisma.customer.findFirst({
        where: { id, businessId },
        select: { id: true },
      });
      return !!row;
    }
    case "invoice": {
      const row = await prisma.invoice.findFirst({
        where: { id, businessId },
        select: { id: true },
      });
      return !!row;
    }
    default:
      return false;
  }
}

type FindArgs = {
  where: Record<string, unknown>;
  include?: unknown;
  select?: unknown;
};

/** Pola query terlindungi tenant — pastikan where.businessId diset konsisten. */
export function tenantProtectedQuery<T extends FindArgs>(
  businessId: string,
  baseWhere: T["where"],
): T["where"] {
  return { ...baseWhere, businessId };
}
