"use client";

import type { OrderStatus } from "@prisma/client";
import { create } from "zustand";

export type OrdersStatusFilter = "ALL" | OrderStatus;

type OrdersUiState = {
  statusFilter: OrdersStatusFilter;
  setStatusFilter: (v: OrdersStatusFilter) => void;
};

export const useOrdersUiStore = create<OrdersUiState>((set) => ({
  statusFilter: "ALL",
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
