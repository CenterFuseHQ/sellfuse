import { describe, expect, it } from "vitest";
import { InMemoryIdentityService, buyFuseEntitlement, hasPermission, sellFuseEntitlement } from "./index.js";

describe("shared CenterFuse identity boundary", () => {
  it("issues product-scoped entitlements and checks permissions", async () => {
    const identity = new InMemoryIdentityService({ secret: "shared-test-secret-that-is-at-least-32-characters", issuer: "centerfuse", audience: "centerfuse-products", defaultEntitlements: [buyFuseEntitlement] });
    const { accessToken } = await identity.register({ email: "buyer@example.com", password: "correct horse battery staple" });
    const context = identity.context(`Bearer ${accessToken}`)!;
    expect(hasPermission(context, "BUYFUSE_WORKSPACE_WRITE")).toBe(true);
    expect(hasPermission(context, "SELLFUSE_LISTING_PUBLISH")).toBe(false);
    expect(identity.authorize(`Bearer ${accessToken}`, "SELLFUSE_LISTING_PUBLISH")).toBeNull();
  });

  it("supports a migration-safe SellFuse entitlement without granting BuyFuse writes", () => {
    const context = { userId: "user", entitlements: [sellFuseEntitlement] };
    expect(hasPermission(context, "SELLFUSE_LISTING_WRITE")).toBe(true);
    expect(hasPermission(context, "BUYFUSE_WORKSPACE_WRITE")).toBe(false);
  });
});
