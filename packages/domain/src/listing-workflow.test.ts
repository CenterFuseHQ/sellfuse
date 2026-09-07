import { describe, expect, it } from "vitest";
import { ListingWorkflow } from "./listing-workflow.js";

const master = {
  title: "Blue ceramic table lamp",
  category: "Home decor",
  description:
    "Blue ceramic table lamp in working condition as reported by the seller.",
  notableFeatures: ["Ceramic base"],
  defects: [],
  searchKeywords: ["blue lamp", "ceramic lamp"],
  fulfillment: "BOTH" as const,
  quantity: 1,
  suggestedPrice: 35,
  missingInformation: [],
  sellerReviewed: false,
};

describe("listing lifecycle", () => {
  it("requires user review before publishing", async () => {
    const workflow = new ListingWorkflow();
    const listing = workflow.create("user-1", master, ["FACEBOOK_MARKETPLACE"]);
    await expect(workflow.publish(listing.id, "user-1")).rejects.toThrow(
      "SELLER_REVIEW_REQUIRED",
    );
  });

  it("marks sold once and creates delist actions for every destination", async () => {
    const workflow = new ListingWorkflow();
    const listing = workflow.create("user-1", master, [
      "FACEBOOK_MARKETPLACE",
      "MERCARI",
      "EBAY",
    ]);
    workflow.review(listing.id, "user-1", { suggestedPrice: 39 });
    await workflow.publish(listing.id, "user-1");
    const sold = await workflow.markSold(
      listing.id,
      "user-1",
      "FACEBOOK_MARKETPLACE",
    );
    expect(sold.status).toBe("SOLD");
    expect(sold.soldActions).toHaveLength(3);
    expect(
      sold.soldActions.every(
        (action) => action.status === "MANUAL_ACTION_REQUIRED",
      ),
    ).toBe(true);
  });
});
