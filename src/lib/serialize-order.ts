import type { OrderStatus } from "@prisma/client";

export type OrderListRow = {
  id: string;
  title: string;
  status: OrderStatus;
  amount: number;
  createdAt: Date;
  customer: { id: string; name: string; phone: string };
};

type OrderWithCustomer = {
  id: string;
  title: string;
  status: OrderStatus;
  amount: { toNumber?: () => number } | string | number;
  createdAt: Date;
  customer: { id: string; name: string; phone: string };
};

export function serializeOrderRow(o: OrderWithCustomer): OrderListRow {
  const amount =
    typeof o.amount === "object" && o.amount !== null && "toNumber" in o.amount
      ? (o.amount as { toNumber: () => number }).toNumber()
      : Number(o.amount);
  return {
    id: o.id,
    title: o.title,
    status: o.status,
    amount,
    createdAt: o.createdAt,
    customer: o.customer,
  };
}

export function serializeOrderRows(orders: OrderWithCustomer[]): OrderListRow[] {
  return orders.map(serializeOrderRow);
}
