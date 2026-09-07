import type { ItemAnalysis, MarketEvidenceInput } from "@sellfuse/validation";
import { MarketEvidenceSchema } from "@sellfuse/validation";

export interface MarketDataQuery {
  likelyItem: string;
  brand?: string;
  model?: string;
  category: string;
  condition?: string;
  attributes: Record<string, string>;
}

export interface MarketDataSource {
  readonly id: string;
  search(query: MarketDataQuery): Promise<unknown[]>;
}

export interface MarketDataRetrieval {
  evidence: MarketEvidenceInput[];
  limitations: string[];
}

export class AllowedMarketDataRetriever {
  private readonly allowedIds: Set<string>;

  constructor(
    private readonly sources: MarketDataSource[],
    allowedSourceIds: string[],
  ) {
    this.allowedIds = new Set(allowedSourceIds);
  }

  async retrieve(analysis: ItemAnalysis): Promise<MarketDataRetrieval> {
    const query: MarketDataQuery = {
      likelyItem: analysis.likelyItem,
      category: analysis.category,
      attributes: analysis.attributes,
      ...(analysis.brand ? { brand: analysis.brand } : {}),
      ...(analysis.model ? { model: analysis.model } : {}),
      ...(analysis.condition ? { condition: analysis.condition } : {}),
    };
    const enabled = this.sources.filter((source) =>
      this.allowedIds.has(source.id),
    );
    const batches = await Promise.allSettled(
      enabled.map((source) => source.search(query)),
    );
    const result = new Map<string, MarketEvidenceInput>();
    const limitations: string[] = [];
    for (const [index, batch] of batches.entries()) {
      if (batch.status === "rejected") {
        limitations.push(
          `Market data source ${enabled[index]!.id} was unavailable.`,
        );
        continue;
      }
      for (const candidate of batch.value) {
        const parsed = MarketEvidenceSchema.safeParse(candidate);
        if (!parsed.success || parsed.data.type === "AI_ESTIMATE_ONLY")
          continue;
        result.set(parsed.data.id, parsed.data);
      }
    }
    return { evidence: [...result.values()], limitations };
  }
}

export interface HttpMarketDataSourceOptions {
  id: string;
  baseUrl: string;
  token: string;
  timeoutMs?: number;
}

export class HttpMarketDataSource implements MarketDataSource {
  readonly id: string;
  private readonly baseUrl: string;

  constructor(private readonly options: HttpMarketDataSourceOptions) {
    this.id = options.id;
    if (options.token.length < 32)
      throw new Error("Market data token must contain at least 32 characters");
    const url = new URL(options.baseUrl);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Market data URL must use HTTP or HTTPS");
    this.baseUrl = url.toString().replace(/\/$/, "");
  }

  async search(query: MarketDataQuery): Promise<unknown[]> {
    const response = await fetch(`${this.baseUrl}/v1/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.token}`,
      },
      body: JSON.stringify({ sourceId: this.id, query }),
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 10_000),
    });
    if (!response.ok) throw new Error("MARKET_DATA_UNAVAILABLE");
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !Array.isArray((payload as { evidence?: unknown }).evidence)
    )
      throw new Error("INVALID_MARKET_DATA_RESPONSE");
    return (payload as { evidence: unknown[] }).evidence;
  }
}

export class NoMarketDataSource implements MarketDataSource {
  readonly id = "none";
  async search(): Promise<unknown[]> {
    return [];
  }
}

export class MockMarketDataSource implements MarketDataSource {
  constructor(
    public readonly id: string,
    private readonly results: unknown[],
  ) {}
  async search(): Promise<unknown[]> {
    return this.results;
  }
}
