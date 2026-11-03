import { describe, expect, it } from "vitest";
import { MarketEvidenceSchema } from "./index.js";

const evidence = {
  id: "listing-44",
  type: "SOLD_COMPARABLE",
  title: "Completed sale",
  sourceName: "Authorized county export",
  sourceUrl: "https://example.test/property/44",
  observedAt: "2026-11-03T00:00:00.000Z",
  price: 250,
  currency: "USD",
  reliability: "HIGH",
};

describe("market evidence source URLs", () => {
  it("accepts public HTTP(S) evidence links", () => {
    expect(MarketEvidenceSchema.safeParse(evidence).success).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///private/record.json",
    "https://user:password@example.test/property/44",
    "https://example.test/property/44?access_token=private-value",
    "https://example.test/property/44?code=private-value",
    "https://example.test/property/44#session=private-value",
  ])("rejects unsafe or credential-bearing URLs: %s", (sourceUrl) => {
    expect(
      MarketEvidenceSchema.safeParse({ ...evidence, sourceUrl }).success,
    ).toBe(false);
  });
});
