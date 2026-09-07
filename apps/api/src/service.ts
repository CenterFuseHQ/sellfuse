import type { Marketplace, MasterListing } from "@sellfuse/types";
import { MARKETPLACES } from "@sellfuse/types";
import { marketplaceCapabilities } from "@sellfuse/marketplace-adapters";
import { ListingWorkflow, SellFuseIntelligenceService } from "@sellfuse/domain";

export interface ApiRequest {
  method: string;
  path: string;
  userId: string;
  body?: unknown;
}
export interface ApiResponse {
  status: number;
  body: unknown;
}

function bodyRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("INVALID_BODY");
  return body as Record<string, unknown>;
}

function marketplaceList(value: unknown): Marketplace[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry) => MARKETPLACES.includes(entry as Marketplace))
  )
    throw new Error("INVALID_MARKETPLACES");
  return value as Marketplace[];
}

export class SellFuseApiService {
  constructor(
    private readonly intelligence: SellFuseIntelligenceService,
    private readonly workflow = new ListingWorkflow(),
  ) {}

  async handle(request: ApiRequest): Promise<ApiResponse> {
    try {
      if (
        request.method === "GET" &&
        request.path === "/v1/marketplaces/capabilities"
      )
        return { status: 200, body: marketplaceCapabilities() };
      if (
        request.method === "POST" &&
        request.path === "/v1/intelligence/prepare"
      ) {
        const body = bodyRecord(request.body);
        const result = await this.intelligence.prepare({
          photos: body.photos as never,
          marketplaces: marketplaceList(body.marketplaces),
          ...(typeof body.sellerNotes === "string"
            ? { sellerNotes: body.sellerNotes }
            : {}),
        });
        return { status: 200, body: result };
      }
      if (
        request.method === "POST" &&
        request.path === "/v1/intelligence/manual"
      ) {
        const body = bodyRecord(request.body);
        const result = this.intelligence.createManual({
          title: String(body.title ?? ""),
          category: String(body.category ?? ""),
          description: String(body.description ?? ""),
          price: Number(body.price),
          marketplaces: marketplaceList(body.marketplaces),
        });
        return { status: 200, body: result };
      }
      if (request.method === "POST" && request.path === "/v1/listings") {
        const body = bodyRecord(request.body);
        const listing = this.workflow.create(
          request.userId,
          body.masterListing as MasterListing,
          marketplaceList(body.marketplaces),
        );
        return { status: 201, body: listing };
      }
      const match = request.path.match(
        /^\/v1\/listings\/([^/]+)\/(review|publish|sold)$/,
      );
      if (match) {
        const id = match[1]!;
        if (request.method !== "POST")
          return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
        if (match[2] === "review")
          return {
            status: 200,
            body: this.workflow.review(
              id,
              request.userId,
              bodyRecord(request.body) as Partial<MasterListing>,
            ),
          };
        if (match[2] === "publish")
          return {
            status: 200,
            body: await this.workflow.publish(id, request.userId),
          };
        const body = bodyRecord(request.body);
        return {
          status: 200,
          body: await this.workflow.markSold(
            id,
            request.userId,
            marketplaceList([body.soldOn])[0]!,
          ),
        };
      }
      return { status: 404, body: { error: "NOT_FOUND" } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "INVALID_REQUEST";
      const status =
        message === "LISTING_NOT_FOUND"
          ? 404
          : message === "SELLER_REVIEW_REQUIRED" ||
              message === "LISTING_NOT_PUBLISHED"
            ? 409
            : 400;
      return { status, body: { error: message } };
    }
  }
}
