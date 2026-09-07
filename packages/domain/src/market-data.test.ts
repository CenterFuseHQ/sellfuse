import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpMarketDataSource } from "./market-data.js";

afterEach(() => vi.unstubAllGlobals());

describe("market data connector", () => {
  it("uses separate internal authentication and a named source", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        expect(init?.headers).toMatchObject({
          authorization:
            "Bearer internal-market-token-that-is-at-least-32-characters",
        });
        expect(JSON.parse(String(init?.body))).toMatchObject({
          sourceId: "licensed-sold-data",
        });
        return new Response(
          JSON.stringify({
            evidence: [
              {
                id: "sold-1",
                type: "SOLD_COMPARABLE",
                title: "Comparable item",
                sourceName: "Licensed fixture",
                sourceUrl: "https://example.test/sold-1",
                observedAt: "2026-09-01T12:00:00.000Z",
                price: 25,
                currency: "USD",
                reliability: "HIGH",
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const source = new HttpMarketDataSource({
      id: "licensed-sold-data",
      baseUrl: "https://market-data.internal",
      token: "internal-market-token-that-is-at-least-32-characters",
    });
    const evidence = await source.search({
      likelyItem: "Ceramic vase",
      category: "Home decor",
      attributes: {},
    });
    expect(evidence).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://market-data.internal/v1/search",
      expect.any(Object),
    );
  });
});
