import type { AiGateway } from "@sellfuse/ai-gateway";
import { GatewayUnavailableError } from "@sellfuse/ai-gateway";
import type {
  IntelligenceResult,
  Marketplace,
  MasterListing,
} from "@sellfuse/types";
import { createAdapterRegistry } from "@sellfuse/marketplace-adapters";
import { z } from "zod";
import {
  AnalyzeItemRequestSchema,
  ItemAnalysisSchema,
  MasterListingSchema,
  PricingSuggestionSchema,
  type ImageInput,
  type ItemAnalysis,
  type PricingSuggestion,
} from "@sellfuse/validation";
import { assertValidImages } from "@sellfuse/validation";
import { AllowedMarketDataRetriever } from "./market-data.js";
import {
  identificationPrompt,
  listingPrompt,
  repairPrompt,
  valuationPrompt,
} from "./prompts.js";
import { valueFromEvidence } from "./valuation.js";

const schemas = {
  identification: z.toJSONSchema(ItemAnalysisSchema),
  valuation: z.toJSONSchema(PricingSuggestionSchema),
  listing: z.toJSONSchema(MasterListingSchema),
};

export interface PrepareListingInput {
  photos: ImageInput[];
  sellerNotes?: string;
  marketplaces: Marketplace[];
}

export interface ManualListingInput {
  title: string;
  category: string;
  description: string;
  price: number;
  marketplaces: Marketplace[];
}

export class SellFuseIntelligenceService {
  constructor(
    private readonly gateway: AiGateway,
    private readonly marketData: AllowedMarketDataRetriever,
  ) {}

  async prepare(input: PrepareListingInput): Promise<IntelligenceResult> {
    const request = AnalyzeItemRequestSchema.parse({
      photos: input.photos,
      ...(input.sellerNotes ? { sellerNotes: input.sellerNotes } : {}),
    });
    assertValidImages(request.photos, 8 * 1024 * 1024, 8);
    try {
      const rawAnalysis = await this.gateway.infer({
        modelRole: "VISION_MODEL",
        messages: [
          {
            role: "system",
            content: identificationPrompt(request.sellerNotes),
          },
        ],
        images: request.photos,
        responseSchema: schemas.identification,
        temperature: 0,
        maxTokens: 1800,
      });
      const analysis = this.sanitizeAnalysis(
        await this.parseWithRepair(
          rawAnalysis.content,
          "item analysis",
          ItemAnalysisSchema,
          schemas.identification,
        ),
      );
      const marketData = await this.marketData.retrieve(analysis);
      const evidence = marketData.evidence;
      let selection: PricingSuggestion | undefined;
      if (evidence.length) {
        const rawValuation = await this.gateway.infer({
          modelRole: "TEXT_MODEL",
          messages: [
            { role: "system", content: valuationPrompt(analysis, evidence) },
          ],
          responseSchema: schemas.valuation,
          temperature: 0,
          maxTokens: 900,
        });
        selection = await this.parseWithRepair(
          rawValuation.content,
          "valuation reasoning",
          PricingSuggestionSchema,
          schemas.valuation,
        );
      }
      const baseValuation = valueFromEvidence(analysis, evidence, selection);
      const valuation = {
        ...baseValuation,
        limitations: [...baseValuation.limitations, ...marketData.limitations],
      };
      const rawListing = await this.gateway.infer({
        modelRole: "TEXT_MODEL",
        messages: [
          {
            role: "system",
            content: listingPrompt(analysis, valuation, request.sellerNotes),
          },
        ],
        responseSchema: schemas.listing,
        temperature: 0.1,
        maxTokens: 1800,
      });
      const generatedListing = await this.parseWithRepair(
        rawListing.content,
        "master listing",
        MasterListingSchema,
        schemas.listing,
      );
      const masterListing = this.enforceListingFacts(
        generatedListing,
        analysis,
        valuation,
      );
      const registry = createAdapterRegistry();
      const marketplaceDrafts = input.marketplaces.map((marketplace) =>
        registry.get(marketplace)!.transformListing(masterListing),
      );
      return {
        analysis,
        valuation,
        masterListing,
        marketplaceDrafts,
        mode: "AI_ASSISTED",
        nextAction: "REVIEW",
        notices:
          valuation.recommendedAsk === null
            ? [
                "No evidence-backed price is available. Add a price during review.",
              ]
            : [],
      };
    } catch (error) {
      if (
        error instanceof GatewayUnavailableError ||
        error instanceof SyntaxError
      )
        return this.manualRequired();
      throw error;
    }
  }

  createManual(input: ManualListingInput): IntelligenceResult {
    const masterListing: MasterListing = MasterListingSchema.parse({
      title: input.title,
      category: input.category,
      description: input.description,
      notableFeatures: [],
      defects: [],
      suggestedPrice: input.price,
      searchKeywords: [],
      fulfillment: "BOTH",
      quantity: 1,
      missingInformation: [],
      sellerReviewed: false,
    });
    const analysis = this.unknownAnalysis();
    const valuation = valueFromEvidence(analysis, [
      {
        id: "manual-price",
        type: "USER_INPUT",
        title: input.title,
        sourceName: "Seller",
        observedAt: new Date().toISOString(),
        price: input.price,
        currency: "USD",
        reliability: "LOW",
      },
    ]);
    const registry = createAdapterRegistry();
    return {
      analysis,
      valuation,
      masterListing,
      marketplaceDrafts: input.marketplaces.map((marketplace) =>
        registry.get(marketplace)!.transformListing(masterListing),
      ),
      mode: "MANUAL_REQUIRED",
      nextAction: "REVIEW",
      notices: [
        "Created manually; the seller-provided price is not independent market evidence.",
      ],
    };
  }

  private async parseWithRepair<T>(
    raw: string,
    name: string,
    schema: {
      safeParse(
        value: unknown,
      ): { success: true; data: T } | { success: false };
    },
    responseSchema: Record<string, unknown>,
  ): Promise<T> {
    try {
      const parsed = schema.safeParse(this.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      // A single constrained repair attempt is allowed before failing closed.
    }
    const repair = await this.gateway.infer({
      modelRole: "TEXT_MODEL",
      messages: [{ role: "system", content: repairPrompt(raw, name) }],
      responseSchema,
      temperature: 0,
      maxTokens: 1800,
    });
    let repaired: ReturnType<typeof schema.safeParse>;
    try {
      repaired = schema.safeParse(this.parse(repair.content));
    } catch {
      throw new SyntaxError(`Invalid ${name} response`);
    }
    if (!repaired.success) throw new SyntaxError(`Invalid ${name} response`);
    return repaired.data;
  }

  private parse(raw: string): unknown {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    return JSON.parse(cleaned);
  }

  private sanitizeAnalysis(analysis: ItemAnalysis): ItemAnalysis {
    const supports = (field: "brand" | "model") =>
      analysis.evidence.some(
        (entry) =>
          entry.field.toLowerCase() === field &&
          entry.source !== "INFERRED" &&
          entry.confidence >= 0.65,
      );
    const uncertain = analysis.confidence < 0.65;
    const missing = new Set(analysis.missingInformation);
    const result = { ...analysis };
    if (analysis.brand && (uncertain || !supports("brand"))) {
      delete result.brand;
      missing.add("Confirm the brand from a label or seller input.");
    }
    if (analysis.model && (uncertain || !supports("model"))) {
      delete result.model;
      missing.add("Confirm the exact model or model number.");
    }
    return { ...result, missingInformation: [...missing] };
  }

  private manualRequired(): IntelligenceResult {
    const analysis = this.unknownAnalysis();
    return {
      analysis,
      valuation: valueFromEvidence(analysis, []),
      masterListing: null,
      marketplaceDrafts: [],
      mode: "MANUAL_REQUIRED",
      nextAction: "COMPLETE_MANUALLY",
      notices: [
        "AI assistance is temporarily unavailable or returned an invalid response. Your work is safe; continue manually.",
      ],
    };
  }

  private enforceListingFacts(
    generated: MasterListing,
    analysis: ItemAnalysis,
    valuation: IntelligenceResult["valuation"],
  ): MasterListing {
    const safe: MasterListing = { ...generated, sellerReviewed: false };
    if (analysis.brand) safe.brand = analysis.brand;
    else delete safe.brand;
    if (analysis.model) safe.model = analysis.model;
    else delete safe.model;
    if (analysis.condition) safe.condition = analysis.condition;
    else delete safe.condition;
    delete safe.estimatedRetailValue;
    if (
      valuation.recommendedAsk !== null &&
      valuation.quickSalePrice !== null &&
      valuation.highAskPrice !== null
    ) {
      safe.suggestedPrice = valuation.recommendedAsk;
      safe.priceRange = {
        low: valuation.quickSalePrice,
        high: valuation.highAskPrice,
      };
    } else {
      delete safe.suggestedPrice;
      delete safe.priceRange;
    }
    return MasterListingSchema.parse(safe);
  }

  private unknownAnalysis(): ItemAnalysis {
    return {
      likelyItem: "Unidentified item",
      category: "Other",
      visibleDamage: [],
      attributes: {},
      confidence: 0,
      missingInformation: ["Item title", "Category", "Condition", "Price"],
      evidence: [],
    };
  }
}
