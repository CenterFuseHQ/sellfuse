import { describe, expect, it } from "vitest";
import { createAdapterRegistry, marketplaceCapabilities, marketplaceProviderRegistry } from "./index.js";

const listing = {
  title: "A".repeat(200),
  category: "Electronics",
  description: "Working television with remote.",
  notableFeatures: ["HDMI"],
  defects: ["Small stand scuff"],
  searchKeywords: ["used tv", "television"],
  fulfillment: "PICKUP" as const,
  quantity: 1,
  suggestedPrice: 120,
  missingInformation: [],
  sellerReviewed: true,
};

describe("marketplace adapters", () => {
  it("honors title constraints and assisted capabilities", async () => {
    const adapter = createAdapterRegistry().get("FACEBOOK_MARKETPLACE")!;
    const draft = adapter.transformListing(listing);
    expect(draft.title).toHaveLength(150);
    expect(adapter.capabilities().mode).toBe("ASSISTED");
    expect(
      (await adapter.publish(draft, { userId: "u", listingId: "l" })).status,
    ).toBe("ASSISTED");
  });

  it("does not claim planned direct adapters are available", () => {
    const ebay = createAdapterRegistry().get("EBAY")!.capabilities();
    expect(ebay.mode).toBe("DIRECT_API");
    expect(ebay.implementationStatus).toBe("PLANNED");
    expect(ebay.canPublish).toBe(false);
  });

  it("optimizes listing content for marketplace capabilities", () => {
    const registry = createAdapterRegistry();
    const instagram = registry.get("INSTAGRAM")!.transformListing(listing);
    const craigslist = registry
      .get("CRAIGSLIST")!
      .transformListing({ ...listing, location: "Pasadena, CA" });
    expect(instagram.hashtags).toEqual(["#usedtv", "#television"]);
    expect(instagram.pickup).toBe(false);
    expect(craigslist.description).toMatch(/^Available in Pasadena, CA\./);
    expect(craigslist.shipping).toBe(false);
  });

  it("reports an explicit capability record for every supported marketplace", () => {
    const capabilities = marketplaceCapabilities();
    expect(capabilities).toHaveLength(9);
    expect(capabilities.every((entry) => entry.disclosure.length > 0)).toBe(
      true,
    );
    expect(
      capabilities
        .filter((entry) => entry.implementationStatus === "AVAILABLE")
        .every((entry) => entry.mode === "ASSISTED"),
    ).toBe(true);
  });

  it("never promotes a handoff or planned API to an available capability", () => {
    const registry = marketplaceProviderRegistry();
    expect(registry.list()).toHaveLength(9);
    expect(registry.supports("FACEBOOK_MARKETPLACE", "LISTINGS_CREATE")).toBe(false);
    expect(registry.supports("EBAY", "LISTINGS_CREATE")).toBe(false);
    expect(registry.get("FACEBOOK_MARKETPLACE")?.availability).toBe("MANUAL_ONLY");
  });
});
