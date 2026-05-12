import { OrderAttachmentType } from "@prisma/client";
import { z } from "zod";

export const orderAttachmentTypeSchema = z.nativeEnum(OrderAttachmentType);

export const orderUploadFormSchema = z.object({
  orderId: z.string().min(1),
  type: orderAttachmentTypeSchema,
});
