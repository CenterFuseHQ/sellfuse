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

export class AllowedMarketDataRetriever {
  private readonly allowedIds: Set<string>;

  constructor(
    private readonly sources: MarketDataSource[],
    allowedSourceIds: string[],
  ) {
    this.allowedIds = new Set(allowedSourceIds);
  }

  async retrieve(analysis: ItemAnalysis): Promise<MarketEvidenceInput[]> {
    const query: MarketDataQuery = {
      likelyItem: analysis.likelyItem,
      category: analysis.category,
      attributes: analysis.attributes,
      ...(analysis.brand ? { brand: analysis.brand } : {}),
      ...(analysis.model ? { model: analysis.model } : {}),
      ...(analysis.condition ? { condition: analysis.condition } : {}),
    };
    const batches = await Promise.all(
      this.sources
        .filter((source) => this.allowedIds.has(source.id))
        .map((source) => source.search(query)),
    );
    const result = new Map<string, MarketEvidenceInput>();
    for (const candidate of batches.flat()) {
      const parsed = MarketEvidenceSchema.safeParse(candidate);
      if (!parsed.success || parsed.data.type === "AI_ESTIMATE_ONLY") continue;
      result.set(parsed.data.id, parsed.data);
    }
    return [...result.values()];
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
