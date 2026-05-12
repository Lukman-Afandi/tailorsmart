import { z } from "zod";
import { sanitizeNoteHtml, sanitizePlainText } from "@/lib/sanitize";

const celanaSchema = z.object({
  panjang: z.string().optional(),
  bawah: z.string().optional(),
  lutut: z.string().optional(),
  paha: z.string().optional(),
  kilMistak: z.string().optional(),
  pinggang: z.string().optional(),
  pinggul: z.string().optional(),
});

const bajuSchema = z.object({
  panjang: z.string().optional(),
  lingkarDada: z.string().optional(),
  pinggang: z.string().optional(),
  pinggul: z.string().optional(),
  bahu: z.string().optional(),
  panjangLengan: z.string().optional(),
  lingkarLengan: z.string().optional(),
  pergelangan: z.string().optional(),
  leher: z.string().optional(),
});

export const bodyMeasurementsSchema = z.object({
  celana: celanaSchema.optional(),
  baju: bajuSchema.optional(),
  tinggiBadan: z.string().optional(),
});

export const customerFormSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(200),
  phone: z
    .string()
    .min(8, "Nomor HP minimal 8 digit")
    .max(32)
    .regex(/^[\d+\-\s()]+$/, "Format nomor tidak valid"),
  address: z
    .string()
    .max(2000)
    .optional()
    .transform((s) =>
      s == null || s === "" ? undefined : sanitizePlainText(s, 2000) ?? undefined,
    ),
  notes: z
    .string()
    .max(8000)
    .optional()
    .transform((s) => sanitizeNoteHtml(s) ?? ""),
  bodyMeasurements: bodyMeasurementsSchema.optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
