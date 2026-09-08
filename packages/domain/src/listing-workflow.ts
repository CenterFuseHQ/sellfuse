import { randomUUID } from "node:crypto";
import type {
  Marketplace,
  MarketplaceListingDraft,
  MasterListing,
  ChannelPublication,
} from "@sellfuse/types";
import {
  createAdapterRegistry,
  type DelistResult,
  type PublishResult,
} from "@sellfuse/marketplace-adapters";
import { MasterListingSchema } from "@sellfuse/validation";

export interface WorkflowListing {
  id: string;
  userId: string;
  masterListing: MasterListing;
  drafts: MarketplaceListingDraft[];
  status: "DRAFT" | "REVIEWED" | "PUBLISHED" | "SOLD";
  publishResults: PublishResult[];
  soldActions: DelistResult[];
  channelPublications: ChannelPublication[];
}

export class ListingWorkflow {
  private readonly listings = new Map<string, WorkflowListing>();
  private readonly adapters = createAdapterRegistry();

  create(
    userId: string,
    masterListing: MasterListing,
    marketplaces: Marketplace[],
  ): WorkflowListing {
    if (!marketplaces.length) throw new Error("NO_MARKETPLACE_SELECTED");
    const safe = MasterListingSchema.parse({
      ...masterListing,
      sellerReviewed: false,
    });
    const listingId = randomUUID();
    const listing: WorkflowListing = {
      id: listingId,
      userId,
      masterListing: safe,
      drafts: marketplaces.map((marketplace) =>
        this.adapters.get(marketplace)!.transformListing(safe),
      ),
      status: "DRAFT",
      publishResults: [],
      soldActions: [],
      channelPublications: marketplaces.map((marketplace) => ({
        marketplace,
        status: "NOT_STARTED",
        idempotencyKey: `${listingId}:${marketplace}`,
      })),
    };
    this.listings.set(listing.id, listing);
    return listing;
  }

  review(
    id: string,
    userId: string,
    edits: Partial<MasterListing> = {},
  ): WorkflowListing {
    const listing = this.requireOwned(id, userId);
    listing.masterListing = MasterListingSchema.parse({
      ...listing.masterListing,
      ...edits,
      sellerReviewed: true,
    });
    listing.drafts = listing.drafts.map((draft) =>
      this.adapters
        .get(draft.marketplace)!
        .transformListing(listing.masterListing),
    );
    listing.status = "REVIEWED";
    return listing;
  }

  async publish(id: string, userId: string): Promise<WorkflowListing> {
    const listing = this.requireOwned(id, userId);
    if (!listing.masterListing.sellerReviewed)
      throw new Error("SELLER_REVIEW_REQUIRED");
    listing.publishResults = await Promise.all(
      listing.drafts.map((draft) =>
        this.adapters
          .get(draft.marketplace)!
          .publish(draft, { userId, listingId: id }),
      ),
    );
    listing.channelPublications = listing.publishResults.map((result) => ({
      marketplace: result.marketplace,
      status:
        result.status === "LIVE"
          ? "SYNCED"
          : result.status === "ASSISTED"
            ? "ACTION_REQUIRED"
            : "FAILED",
      idempotencyKey:
        listing.channelPublications.find(
          (publication) => publication.marketplace === result.marketplace,
        )?.idempotencyKey ?? `${listing.id}:${result.marketplace}`,
      ...(result.externalId ? { externalId: result.externalId } : {}),
      ...(result.errorCode
        ? { providerError: { code: result.errorCode, message: "Marketplace publication failed." } }
        : {}),
      lastSynchronizedAt: new Date().toISOString(),
    }));
    listing.status = "PUBLISHED";
    return listing;
  }

  async markSold(
    id: string,
    userId: string,
    soldOn: Marketplace,
  ): Promise<WorkflowListing> {
    const listing = this.requireOwned(id, userId);
    if (listing.status !== "PUBLISHED")
      throw new Error("LISTING_NOT_PUBLISHED");
    if (!listing.drafts.some((draft) => draft.marketplace === soldOn))
      throw new Error("SOLD_MARKETPLACE_NOT_LISTED");
    listing.soldActions = await Promise.all(
      listing.drafts.map((draft) => {
        const adapter = this.adapters.get(draft.marketplace)!;
        return draft.marketplace === soldOn
          ? adapter.markSold({ userId, listingId: id })
          : adapter.remove({ userId, listingId: id });
      }),
    );
    listing.status = "SOLD";
    listing.channelPublications = listing.channelPublications.map((publication) => {
      const action = listing.soldActions.find(
        (result) => result.marketplace === publication.marketplace,
      );
      return {
        ...publication,
        status:
          action?.status === "REMOVED"
            ? "REMOVED"
            : action?.status === "FAILED"
              ? "FAILED"
              : "ACTION_REQUIRED",
        ...(action?.status === "FAILED"
          ? {
              providerError: {
                code: "DELIST_FAILED",
                message: "Marketplace removal failed.",
              },
            }
          : {}),
        lastSynchronizedAt: new Date().toISOString(),
      };
    });
    return listing;
  }

  get(id: string, userId: string): WorkflowListing {
    return this.requireOwned(id, userId);
  }

  private requireOwned(id: string, userId: string): WorkflowListing {
    const listing = this.listings.get(id);
    if (!listing || listing.userId !== userId)
      throw new Error("LISTING_NOT_FOUND");
    return listing;
  }
}
