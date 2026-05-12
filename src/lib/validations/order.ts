import {
  OrderPriority,
  OrderStatus,
  PaymentStatus,
  StitchCategory,
  StitchProgress,
} from "@prisma/client";
import { z } from "zod";
import { sanitizeNoteHtml, sanitizePlainText } from "@/lib/sanitize";

export const orderFormSchema = z
  .object({
    customerId: z.string().min(1, "Pilih pelanggan"),
    title: z.string().min(2, "Judul order minimal 2 karakter").max(500),
    description: z
      .string()
      .max(8000)
      .optional()
      .transform((s) =>
        s == null || s === "" ? undefined : sanitizePlainText(s, 8000) ?? undefined,
      ),
    amount: z.coerce.number().min(0, "Nominal tidak boleh negatif"),
    status: z.nativeEnum(OrderStatus),
    category: z.nativeEnum(StitchCategory).optional(),
    stitchProgress: z.nativeEnum(StitchProgress).optional(),
    priority: z.nativeEnum(OrderPriority).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    dpAmount: z.coerce.number().min(0).optional(),
    amountPaid: z.coerce.number().min(0).optional(),
    stitchDeadlineAt: z.coerce.date().optional().nullable(),
    tailorNotes: z
      .string()
      .max(8000)
      .optional()
      .nullable()
      .transform((s) => sanitizeNoteHtml(s)),
    /** `__pool__` = belum ditugaskan (kompatibel dengan Radix Select tanpa value kosong). */
    assignedUserId: z
      .union([z.string().cuid(), z.literal("__pool__")])
      .optional(),
  })
  .superRefine((data, ctx) => {
    const dp = data.dpAmount ?? 0;
    if (dp > data.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Uang muka tidak boleh melebihi total tagihan.",
        path: ["dpAmount"],
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const orderSearchQuerySchema = z.object({
  q: z.string().min(1).max(120),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

export const orderRevisionSchema = z.object({
  orderId: z.string().min(1),
  note: z
    .string()
    .min(2, "Catatan revisi minimal 2 karakter")
    .max(4000)
    .transform((s) => sanitizeNoteHtml(s) ?? ""),
});

export const invoiceCreateSchema = z.object({
  orderId: z.string().min(1),
  taxPercent: z.coerce.number().min(0).max(100).optional().default(0),
  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => sanitizeNoteHtml(s)),
});
