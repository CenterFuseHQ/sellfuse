import { describe, expect, it } from "vitest";
import { GatewayUnavailableError, MockAiGateway } from "@sellfuse/ai-gateway";
import {
  AllowedMarketDataRetriever,
  MockMarketDataSource,
  type MarketDataSource,
} from "./market-data.js";
import { SellFuseIntelligenceService } from "./intelligence.js";

const photo = {
  mimeType: "image/jpeg" as const,
  base64: "/9j/AAAAAAAAAAAAAAAAAAAA",
};
const analysis = {
  likelyItem: "Nintendo Switch OLED console",
  brand: "Nintendo",
  model: "HEG-001",
  category: "Video game consoles",
  condition: "Used - good",
  visibleDamage: ["Light scuff on dock"],
  attributes: { color: "White" },
  confidence: 0.91,
  missingInformation: ["Confirm that the console powers on"],
  evidence: [
    {
      field: "brand",
      value: "Nintendo logo",
      source: "VISIBLE",
      confidence: 0.99,
    },
    {
      field: "model",
      value: "HEG-001 label",
      source: "VISIBLE",
      confidence: 0.91,
    },
  ],
};
const master = {
  title: "Nintendo Switch OLED HEG-001 White Console",
  brand: "Nintendo",
  model: "HEG-001",
  category: "Video game consoles",
  condition: "Used - good",
  description:
    "Nintendo Switch OLED console with white dock. Light visible scuff on the dock.",
  notableFeatures: ["OLED display"],
  defects: ["Light scuff on dock"],
  suggestedPrice: 210,
  priceRange: { low: 170, high: 240 },
  searchKeywords: ["Nintendo Switch OLED", "HEG-001"],
  fulfillment: "BOTH",
  quantity: 1,
  missingInformation: ["Confirm that the console powers on"],
  sellerReviewed: false,
};
const soldEvidence = [
  {
    id: "sold-1",
    type: "SOLD_COMPARABLE",
    title: "Switch OLED",
    sourceName: "Licensed sold-data fixture",
    sourceUrl: "https://example.test/sold-1",
    observedAt: "2026-09-01T12:00:00.000Z",
    price: 200,
    currency: "USD",
    condition: "Used",
    reliability: "HIGH",
  },
  {
    id: "sold-2",
    type: "SOLD_COMPARABLE",
    title: "Switch OLED",
    sourceName: "Licensed sold-data fixture",
    sourceUrl: "https://example.test/sold-2",
    observedAt: "2026-09-02T12:00:00.000Z",
    price: 220,
    currency: "USD",
    condition: "Used",
    reliability: "HIGH",
  },
  {
    id: "sold-3",
    type: "SOLD_COMPARABLE",
    title: "Switch OLED",
    sourceName: "Licensed sold-data fixture",
    sourceUrl: "https://example.test/sold-3",
    observedAt: "2026-09-03T12:00:00.000Z",
    price: 210,
    currency: "USD",
    condition: "Used",
    reliability: "HIGH",
  },
];

function service(
  responses: Array<string | Error>,
  evidence: unknown[] = soldEvidence,
) {
  return new SellFuseIntelligenceService(
    new MockAiGateway(responses),
    new AllowedMarketDataRetriever(
      [new MockMarketDataSource("licensed-test-source", evidence)],
      ["licensed-test-source"],
    ),
  );
}

describe("SellFuse intelligence workflow", () => {
  it("identifies an item from photos and prepares marketplace drafts", async () => {
    const result = await service([
      JSON.stringify(analysis),
      JSON.stringify({
        selectedEvidenceIds: ["sold-1", "sold-2", "sold-3"],
        reasoning: "Three matching sold records support the range.",
        confidence: 0.85,
      }),
      JSON.stringify(master),
    ]).prepare({
      photos: [photo],
      marketplaces: ["EBAY", "FACEBOOK_MARKETPLACE"],
    });
    expect(result.analysis.model).toBe("HEG-001");
    expect(result.valuation.recommendedAsk).toBe(220.5);
    expect(result.marketplaceDrafts).toHaveLength(2);
    expect(result.nextAction).toBe("REVIEW");
  });

  it("sends complete constrained schemas to the local gateway", async () => {
    const gateway = new MockAiGateway([
      JSON.stringify(analysis),
      JSON.stringify(master),
    ]);
    const intelligence = new SellFuseIntelligenceService(
      gateway,
      new AllowedMarketDataRetriever([], []),
    );
    await intelligence.prepare({ photos: [photo], marketplaces: [] });
    const schema = gateway.requests[0]?.responseSchema as {
      properties?: Record<string, unknown>;
      additionalProperties?: boolean;
    };
    expect(schema.properties).toHaveProperty("likelyItem");
    expect(schema.properties).toHaveProperty("evidence");
    expect(schema.additionalProperties).toBe(false);
  });

  it("removes unsupported specifics when identification is uncertain", async () => {
    const uncertain = {
      ...analysis,
      confidence: 0.42,
      evidence: analysis.evidence.map((entry) => ({
        ...entry,
        source: "INFERRED",
        confidence: 0.42,
      })),
    };
    const result = await service(
      [JSON.stringify(uncertain), JSON.stringify(master)],
      [],
    ).prepare({ photos: [photo], marketplaces: [] });
    expect(result.analysis.brand).toBeUndefined();
    expect(result.analysis.model).toBeUndefined();
    expect(result.analysis.missingInformation).toContain(
      "Confirm the exact model or model number.",
    );
  });

  it("returns transparent null prices without market evidence", async () => {
    const result = await service(
      [JSON.stringify(analysis), JSON.stringify(master)],
      [],
    ).prepare({ photos: [photo], marketplaces: [] });
    expect(result.valuation.recommendedAsk).toBeNull();
    expect(result.valuation.evidence[0]?.type).toBe("AI_ESTIMATE_ONLY");
    expect(result.valuation.limitations[0]).toMatch(
      /No reliable market evidence/,
    );
  });

  it("continues safely when an allowed market data source is unavailable", async () => {
    const failingSource: MarketDataSource = {
      id: "licensed-source",
      async search() {
        throw new Error("upstream details must not leak");
      },
    };
    const intelligence = new SellFuseIntelligenceService(
      new MockAiGateway([JSON.stringify(analysis), JSON.stringify(master)]),
      new AllowedMarketDataRetriever([failingSource], ["licensed-source"]),
    );
    const result = await intelligence.prepare({
      photos: [photo],
      marketplaces: [],
    });
    expect(result.nextAction).toBe("REVIEW");
    expect(result.valuation.recommendedAsk).toBeNull();
    expect(result.valuation.limitations).toContain(
      "Market data source licensed-source was unavailable.",
    );
    expect(JSON.stringify(result)).not.toContain("upstream details");
  });

  it("prevents a model from injecting a hallucinated price", async () => {
    const result = await service([
      JSON.stringify(analysis),
      JSON.stringify({
        selectedEvidenceIds: ["sold-1"],
        reasoning: "One supplied match.",
        confidence: 0.4,
        recommendedAsk: 999999,
      }),
      JSON.stringify({
        selectedEvidenceIds: ["sold-1"],
        reasoning: "One supplied match.",
        confidence: 0.4,
      }),
      JSON.stringify(master),
    ]).prepare({ photos: [photo], marketplaces: [] });
    expect(result.valuation.recommendedAsk).toBe(210);
    expect(result.valuation.recommendedAsk).not.toBe(999999);
    expect(result.valuation.evidence.map((entry) => entry.id)).toEqual([
      "sold-1",
    ]);
  });

  it("fails closed to manual mode after malformed responses", async () => {
    const result = await service(["not-json", "still-not-json"], []).prepare({
      photos: [photo],
      marketplaces: [],
    });
    expect(result.mode).toBe("MANUAL_REQUIRED");
    expect(result.masterListing).toBeNull();
  });

  it("keeps manual fallback available when local AI is unavailable", async () => {
    const intelligence = service([new GatewayUnavailableError()], []);
    const unavailable = await intelligence.prepare({
      photos: [photo],
      marketplaces: ["MERCARI"],
    });
    expect(unavailable.nextAction).toBe("COMPLETE_MANUALLY");
    const manual = intelligence.createManual({
      title: "Blue ceramic vase",
      category: "Home decor",
      description: "Blue ceramic vase with a small rim chip.",
      price: 18,
      marketplaces: ["MERCARI"],
    });
    expect(manual.masterListing?.suggestedPrice).toBe(18);
    expect(manual.marketplaceDrafts).toHaveLength(1);
  });
});
