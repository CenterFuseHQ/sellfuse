import { describe, expect, it } from "vitest";
import { buyFuseEntitlement, sellFuseEntitlement } from "@centerfuse/auth";
import { BuyerWorkspaceService } from "./index.js";
const buyer = { userId: "buyer", entitlements: [buyFuseEntitlement] };
describe("BuyFuse workspace", () => {
  it("starts useful and empty, then stores a buyer item", async () => { const service = new BuyerWorkspaceService(); expect(service.get(buyer).savedItems).toEqual([]); const item = await service.save(buyer, { title: "Dining table", notes: "Measure doorway" }); expect(service.get(buyer).savedItems[0]?.title).toBe("Dining table"); expect(service.updateStatus(buyer, item.id, "PURCHASED").status).toBe("PURCHASED"); });
  it("protects buyer mutations from a seller-only entitlement", async () => { const service = new BuyerWorkspaceService(); await expect(service.save({ userId: "seller", entitlements: [sellFuseEntitlement] }, { title: "Item" })).rejects.toThrow("FORBIDDEN"); });
  it("validates untrusted URLs", async () => { await expect(new BuyerWorkspaceService().save(buyer, { title: "Item", sourceUrl: "javascript:alert(1)" })).rejects.toThrow(); });
});
