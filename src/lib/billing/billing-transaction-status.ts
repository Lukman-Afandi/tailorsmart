/** Nilai kolom BillingTransaction.status (Prisma String). */
export const BillingTransactionStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export type BillingTransactionStatus =
  (typeof BillingTransactionStatus)[keyof typeof BillingTransactionStatus];
