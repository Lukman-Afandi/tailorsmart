import { describe, expect, it } from "vitest";
import {
  canAccessOrderRow,
  orderScopeForRole,
} from "@/lib/order-access";

describe("orderScopeForRole", () => {
  it("scopes pegawai to pool or self-assigned", () => {
    const scope = orderScopeForRole("biz1", "PEGAWAI", "userA");
    expect(scope).toEqual({
      businessId: "biz1",
      OR: [{ assignedUserId: null }, { assignedUserId: "userA" }],
    });
  });

  it("does not add extra filter for owner", () => {
    expect(orderScopeForRole("biz1", "OWNER", "x")).toEqual({
      businessId: "biz1",
    });
  });
});

describe("canAccessOrderRow", () => {
  it("rejects cross-tenant", () => {
    expect(
      canAccessOrderRow("OWNER", "u1", { businessId: "b2", assignedUserId: null }, "b1"),
    ).toBe(false);
  });

  it("allows pegawai on pool order", () => {
    expect(
      canAccessOrderRow("PEGAWAI", "u1", { businessId: "b1", assignedUserId: null }, "b1"),
    ).toBe(true);
  });

  it("blocks pegawai on others assigned order", () => {
    expect(
      canAccessOrderRow("PEGAWAI", "u1", { businessId: "b1", assignedUserId: "u2" }, "b1"),
    ).toBe(false);
  });
});
