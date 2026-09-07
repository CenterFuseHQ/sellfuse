export const MARKETPLACES = [
  "EBAY",
  "PINTEREST",
  "FACEBOOK_MARKETPLACE",
  "INSTAGRAM",
  "OFFERUP",
  "MERCARI",
  "POSHMARK",
  "DEPOP",
  "CRAIGSLIST",
] as const;

export type Marketplace = (typeof MARKETPLACES)[number];
export type MarketplaceMode = "DIRECT_API" | "ASSISTED" | "UNAVAILABLE";
export type ImplementationStatus =
  | "PLANNED"
  | "AVAILABLE"
  | "TEMPORARILY_UNAVAILABLE";
export type ListingStatus =
  | "DRAFT"
  | "PENDING"
  | "LIVE"
  | "ASSISTED"
  | "FAILED"
  | "SOLD"
  | "REMOVED"
  | "NEEDS_ATTENTION";
export type ModelRole = "TEXT_MODEL" | "VISION_MODEL" | "EMBEDDING_MODEL";
export type EvidenceType =
  | "SOLD_COMPARABLE"
  | "ACTIVE_LISTING"
  | "RETAIL_REFERENCE"
  | "USER_INPUT"
  | "AI_ESTIMATE_ONLY";
export type EvidenceReliability = "HIGH" | "MEDIUM" | "LOW";

export interface MarketplaceCapability {
  marketplace: Marketplace;
  mode: MarketplaceMode;
  implementationStatus: ImplementationStatus;
  authentication: "OAUTH2" | "ASSISTED_HANDOFF" | "NONE";
  canPublish: boolean;
  canUpdate: boolean;
  canRetrieveStatus: boolean;
  canMarkSold: boolean;
  canRemove: boolean;
  supportsShipping: boolean;
  supportsPickup: boolean;
  titleMaxLength: number;
  descriptionMaxLength: number;
  imageMaxCount: number;
  disclosure: string;
}

export interface MasterListing {
  title: string;
  brand?: string | undefined;
  model?: string | undefined;
  category: string;
  condition?: string | undefined;
  description: string;
  notableFeatures: string[];
  defects: string[];
  dimensions?: string | undefined;
  estimatedRetailValue?: number | undefined;
  suggestedPrice?: number | undefined;
  priceRange?: { low: number; high: number } | undefined;
  searchKeywords: string[];
  fulfillment: "PICKUP" | "SHIPPING" | "BOTH";
  quantity: number;
  location?: string | undefined;
  missingInformation: string[];
  sellerReviewed: boolean;
}

export interface MarketEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  sourceName: string;
  sourceUrl?: string | undefined;
  observedAt: string;
  price?: number | undefined;
  currency: string;
  condition?: string | undefined;
  reliability: EvidenceReliability;
  notes?: string | undefined;
}

export interface Valuation {
  recommendedAsk: number | null;
  quickSalePrice: number | null;
  highAskPrice: number | null;
  currency: string;
  confidence: number;
  evidence: MarketEvidence[];
  limitations: string[];
  /** Model-generated interpretation only. It is never treated as market evidence. */
  reasoning: string;
}

export interface IntelligenceResult {
  analysis: {
    likelyItem: string;
    brand?: string | undefined;
    model?: string | undefined;
    category: string;
    condition?: string | undefined;
    visibleDamage: string[];
    attributes: Record<string, string>;
    confidence: number;
    missingInformation: string[];
    evidence: Array<{
      field: string;
      value: string;
      source: "VISIBLE" | "USER_PROVIDED" | "INFERRED";
      confidence: number;
    }>;
  };
  valuation: Valuation;
  masterListing: MasterListing | null;
  marketplaceDrafts: MarketplaceListingDraft[];
  mode: "AI_ASSISTED" | "MANUAL_REQUIRED";
  nextAction: "REVIEW" | "COMPLETE_MANUALLY";
  notices: string[];
}

export interface MarketplaceListingDraft {
  marketplace: Marketplace;
  title: string;
  description: string;
  category: string;
  price: number;
  hashtags: string[];
  shipping: boolean;
  pickup: boolean;
  warnings: string[];
}

export interface ItemRecord {
  id: string;
  userId: string;
  masterListing: MasterListing;
  marketplaces: Marketplace[];
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  soldAt?: string | undefined;
}
