import { describe, expect, it } from "vitest";
import { MockAiGateway } from "@centerfuse/ai";
import {
  AllowedMarketDataRetriever,
  NoMarketDataSource,
  SellFuseIntelligenceService,
} from "@sellfuse/domain";
import { SellFuseApiService } from "./service.js";

describe("SellFuse API", () => {
  it("exposes marketplace capabilities through the product API", async () => {
    const intelligence = new SellFuseIntelligenceService(
      new MockAiGateway([]),
      new AllowedMarketDataRetriever([new NoMarketDataSource()], []),
    );
    const response = await new SellFuseApiService(intelligence).handle({
      method: "GET",
      path: "/v1/marketplaces/capabilities",
      userId: "u",
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(9);
  });

  it("does not reflect invalid caller-supplied fields in API errors", async () => {
    const privateMarker = "private-seller-input-marker";
    const service = new SellFuseApiService(
      {} as unknown as SellFuseIntelligenceService,
    );
    const response = await service.handle({
      method: "POST",
      path: "/v1/intelligence/prepare",
      userId: "seller",
      body: { photos: privateMarker, sellerNotes: privateMarker },
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "INVALID_REQUEST" });
    expect(JSON.stringify(response.body)).not.toContain(privateMarker);
  });
});
