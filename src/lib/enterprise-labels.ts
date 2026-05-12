import type {
  OrderPriority,
  PaymentStatus,
  StitchCategory,
  StitchProgress,
} from "@prisma/client";

export const STITCH_CATEGORY_LABEL: Record<StitchCategory, string> = {
  JAS: "Jas",
  CELANA: "Celana",
  BAJU: "Baju",
  GAMIS: "Gamis",
  SERAGAM: "Seragam",
  CUSTOM: "Custom",
};

export const STITCH_PROGRESS_LABEL: Record<StitchProgress, string> = {
  RECEIVED: "Kain diterima",
  CUTTING: "Pemotongan",
  SEWING: "Penjahitan",
  FITTING: "Pas badan",
  FINISHING: "Finishing",
  QC: "Kontrol kualitas",
  READY: "Siap ambil",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  BELUM_BAYAR: "Belum bayar",
  DP: "DP",
  LUNAS: "Lunas",
  HUTANG: "Hutang",
};

export const ORDER_PRIORITY_LABEL: Record<OrderPriority, string> = {
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
};
