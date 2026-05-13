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

export const BILLING_TRANSACTION_STATUS_LABEL: Record<
  BillingTransactionStatus,
  string
> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Lunas",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};
