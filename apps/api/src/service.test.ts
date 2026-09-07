import { describe, expect, it } from "vitest";
import { MockAiGateway } from "@sellfuse/ai-gateway";
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
});
