import { OrderStatus } from "@prisma/client";
import type { BadgeProps } from "@/components/ui/badge";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "Diproses",
  COMPLETED: "Selesai",
  PICKED_UP: "Diambil",
};

export const ORDER_STATUS_BADGE: Record<
  OrderStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  PENDING: "warning",
  IN_PROGRESS: "secondary",
  COMPLETED: "success",
  PICKED_UP: "outline",
};
