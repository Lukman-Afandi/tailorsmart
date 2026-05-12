import { z } from "zod";

export const businessProfileSchema = z.object({
  name: z.string().min(2, "Nama bisnis minimal 2 karakter"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type BusinessProfileValues = z.infer<typeof businessProfileSchema>;
