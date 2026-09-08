import { describe, expect, it } from "vitest";
import { PRODUCTS, resolveProductUrls } from "./index.js";

describe("CenterFuse product configuration", () => {
  it("keeps parent, seller, and buyer metadata centralized", () => {
    expect(PRODUCTS.CENTERFUSE.productType).toBe("PARENT");
    expect(PRODUCTS.SELLFUSE.name).toBe("SellFuse");
    expect(PRODUCTS.BUYFUSE.productType).toBe("BUYER");
  });

  it("uses configurable product URLs without assuming acquired domains", () => {
    expect(resolveProductUrls({ BUYFUSE_URL: "https://buyer.example.test/" }).BUYFUSE).toBe("https://buyer.example.test");
  });
});
