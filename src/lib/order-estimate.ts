import { addDays } from "date-fns";
import type { StitchCategory } from "@prisma/client";

/** Hari kerja kasar per kategori — estimasi selesai otomatis. */
const CATEGORY_DAYS: Record<StitchCategory, number> = {
  JAS: 14,
  CELANA: 7,
  BAJU: 5,
  GAMIS: 10,
  SERAGAM: 12,
  CUSTOM: 7,
};

export function leadDaysForCategory(
  category: StitchCategory,
  businessDefault: number,
): number {
  const mapped = CATEGORY_DAYS[category];
  if (category === "CUSTOM") return businessDefault;
  return mapped;
}

export function computeEstimatedCompletion(
  start: Date,
  category: StitchCategory,
  businessDefault: number,
): Date {
  const days = leadDaysForCategory(category, businessDefault);
  return addDays(start, days);
}
