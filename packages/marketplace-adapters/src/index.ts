import type {
  Marketplace,
  MarketplaceCapability,
  MarketplaceListingDraft,
  MasterListing,
} from "@sellfuse/types";
import { MarketplaceListingDraftSchema } from "@sellfuse/validation";

export interface PublishContext {
  userId: string;
  listingId: string;
  accessToken?: string;
}

export interface PublishResult {
  marketplace: Marketplace;
  status: "LIVE" | "ASSISTED" | "FAILED";
  externalId?: string;
  handoffUrl?: string;
  instructions?: string[];
  errorCode?: string;
}

export interface DelistResult {
  marketplace: Marketplace;
  status: "REMOVED" | "MANUAL_ACTION_REQUIRED" | "FAILED";
  instructions?: string[];
}

export interface MarketplaceAdapter {
  readonly marketplace: Marketplace;
  capabilities(): MarketplaceCapability;
  connect(userId: string): Promise<{
    authorizationUrl?: string;
    status: "CONNECTED" | "ACTION_REQUIRED";
  }>;
  disconnect(userId: string): Promise<void>;
  transformListing(master: MasterListing): MarketplaceListingDraft;
  publish(
    draft: MarketplaceListingDraft,
    context: PublishContext,
  ): Promise<PublishResult>;
  update(
    draft: MarketplaceListingDraft,
    context: PublishContext,
  ): Promise<PublishResult>;
  getStatus(context: PublishContext): Promise<PublishResult>;
  markSold(context: PublishContext): Promise<DelistResult>;
  remove(context: PublishContext): Promise<DelistResult>;
}

const rules: Record<Marketplace, MarketplaceCapability> = {
  EBAY: capability(
    "EBAY",
    "DIRECT_API",
    "PLANNED",
    "OAUTH2",
    80,
    500_000,
    24,
    true,
    true,
    "Official Sell Inventory API exists; SellFuse adapter is not yet authorized or tested.",
  ),
  PINTEREST: capability(
    "PINTEREST",
    "DIRECT_API",
    "PLANNED",
    "OAUTH2",
    100,
    800,
    1,
    false,
    false,
    "Official Pin publishing exists; this is not a general used-goods checkout listing.",
  ),
  FACEBOOK_MARKETPLACE: capability(
    "FACEBOOK_MARKETPLACE",
    "ASSISTED",
    "AVAILABLE",
    "ASSISTED_HANDOFF",
    150,
    5000,
    10,
    true,
    true,
    "User completes the Marketplace submission; no automated account actions.",
  ),
  INSTAGRAM: capability(
    "INSTAGRAM",
    "ASSISTED",
    "AVAILABLE",
    "ASSISTED_HANDOFF",
    125,
    2200,
    10,
    false,
    false,
    "Prepared as social content, not represented as a Marketplace listing integration.",
  ),
  OFFERUP: capability(
    "OFFERUP",
    "ASSISTED",
    "AVAILABLE",
    "ASSISTED_HANDOFF",
    50,
    2000,
    12,
    true,
    true,
    "Copy-ready draft; user completes submission in OfferUp.",
  ),
  MERCARI: capability(
    "MERCARI",
    "ASSISTED",
    "AVAILABLE",
    "ASSISTED_HANDOFF",
    80,
    1000,
    12,
    true,
    false,
    "Copy-ready draft; user completes submission in Mercari.",
  ),
  POSHMARK: capability(
    "POSHMARK",
    "ASSISTED",
    "AVAILABLE",
    "ASSISTED_HANDOFF",
    80,
    5000,
    16,
    true,
    false,
    "Copy-ready draft; user completes submission in Poshmark.",
  ),
  DEPOP: capability(
    "DEPOP",
    "ASSISTED",
    "AVAILABLE",
    "ASSISTED_HANDOFF",
    80,
    1000,
    8,
    true,
    false,
    "Copy-ready draft; user completes submission in Depop.",
  ),
  CRAIGSLIST: capability(
    "CRAIGSLIST",
    "ASSISTED",
    "AVAILABLE",
    "ASSISTED_HANDOFF",
    70,
    5000,
    24,
    false,
    true,
    "Copy-ready draft; user completes submission on Craigslist.",
  ),
};

function capability(
  marketplace: Marketplace,
  mode: MarketplaceCapability["mode"],
  implementationStatus: MarketplaceCapability["implementationStatus"],
  authentication: MarketplaceCapability["authentication"],
  titleMaxLength: number,
  descriptionMaxLength: number,
  imageMaxCount: number,
  supportsShipping: boolean,
  supportsPickup: boolean,
  disclosure: string,
): MarketplaceCapability {
  const directAndAvailable =
    mode === "DIRECT_API" && implementationStatus === "AVAILABLE";
  return {
    marketplace,
    mode,
    implementationStatus,
    authentication,
    canPublish: directAndAvailable,
    canUpdate: directAndAvailable,
    canRetrieveStatus: directAndAvailable,
    canMarkSold: directAndAvailable,
    canRemove: directAndAvailable,
    supportsShipping,
    supportsPickup,
    titleMaxLength,
    descriptionMaxLength,
    imageMaxCount,
    disclosure,
  };
}

const handoffUrls: Record<Marketplace, string> = {
  EBAY: "https://www.ebay.com/sl/sell",
  PINTEREST: "https://www.pinterest.com/pin-creation-tool/",
  FACEBOOK_MARKETPLACE: "https://www.facebook.com/marketplace/create/item",
  INSTAGRAM: "https://www.instagram.com/",
  OFFERUP: "https://offerup.com/post/",
  MERCARI: "https://www.mercari.com/sell/",
  POSHMARK: "https://poshmark.com/create-listing",
  DEPOP: "https://www.depop.com/products/create/",
  CRAIGSLIST: "https://post.craigslist.org/",
};

export class AssistedMarketplaceAdapter implements MarketplaceAdapter {
  constructor(public readonly marketplace: Marketplace) {}

  capabilities(): MarketplaceCapability {
    return rules[this.marketplace];
  }

  async connect(_userId: string) {
    return { status: "ACTION_REQUIRED" as const };
  }

  async disconnect(_userId: string): Promise<void> {}

  transformListing(master: MasterListing): MarketplaceListingDraft {
    const limits = this.capabilities();
    const price = master.suggestedPrice ?? master.priceRange?.low ?? 0;
    const searchTerms = master.searchKeywords.slice(0, 10);
    const marketplaceLead =
      this.marketplace === "CRAIGSLIST" && master.location
        ? `Available in ${master.location}. `
        : "";
    const socialTags =
      this.marketplace === "INSTAGRAM" || this.marketplace === "PINTEREST"
        ? searchTerms
            .map((keyword) => `#${keyword.replace(/[^a-zA-Z0-9]/g, "")}`)
            .filter((tag) => tag.length > 1)
        : [];
    return MarketplaceListingDraftSchema.parse({
      marketplace: this.marketplace,
      title: master.title.slice(0, limits.titleMaxLength),
      description:
        `${marketplaceLead}${master.description}\n\n${master.defects.length ? `Known wear: ${master.defects.join("; ")}` : "No additional defects provided."}`.slice(
          0,
          limits.descriptionMaxLength,
        ),
      category: master.category,
      price,
      hashtags: socialTags,
      shipping: master.fulfillment !== "PICKUP" && limits.supportsShipping,
      pickup: master.fulfillment !== "SHIPPING" && limits.supportsPickup,
      warnings:
        limits.implementationStatus === "PLANNED"
          ? [
              "Direct API integration is planned but not enabled; use the assisted handoff.",
            ]
          : [],
    });
  }

  async publish(
    draft: MarketplaceListingDraft,
    _context: PublishContext,
  ): Promise<PublishResult> {
    return {
      marketplace: this.marketplace,
      status: "ASSISTED",
      handoffUrl: handoffUrls[this.marketplace],
      instructions: [
        "Copy the prepared title, description, price, and category.",
        "Review the destination's current rules and complete submission there.",
        `Confirm the final ${draft.marketplace} listing back in SellFuse.`,
      ],
    };
  }

  async update(
    draft: MarketplaceListingDraft,
    context: PublishContext,
  ): Promise<PublishResult> {
    return this.publish(draft, context);
  }

  async getStatus(_context: PublishContext): Promise<PublishResult> {
    return {
      marketplace: this.marketplace,
      status: "ASSISTED",
      handoffUrl: handoffUrls[this.marketplace],
    };
  }

  async markSold(_context: PublishContext): Promise<DelistResult> {
    return this.manualDelist();
  }

  async remove(_context: PublishContext): Promise<DelistResult> {
    return this.manualDelist();
  }

  private manualDelist(): DelistResult {
    return {
      marketplace: this.marketplace,
      status: "MANUAL_ACTION_REQUIRED",
      instructions: [
        `Open ${handoffUrls[this.marketplace]} and remove or mark the listing sold.`,
        "Return to SellFuse and confirm completion.",
      ],
    };
  }
}

export function createAdapterRegistry(): Map<Marketplace, MarketplaceAdapter> {
  return new Map(
    (Object.keys(rules) as Marketplace[]).map((marketplace) => [
      marketplace,
      new AssistedMarketplaceAdapter(marketplace),
    ]),
  );
}

export function marketplaceCapabilities(): MarketplaceCapability[] {
  return Object.values(rules);
}
