import { describe, expect, it } from "vitest";
import { intelligenceViewModel, SELLFUSE_STEPS } from "./workflow.js";
import { renderAppPage } from "./app-page.js";

describe("consumer workflow", () => {
  it("keeps intelligence inside the end-to-end selling journey", () => {
    expect(SELLFUSE_STEPS).toEqual(
      expect.arrayContaining([
        "Take pictures",
        "Check market evidence",
        "Publish",
        "Mark sold once",
      ]),
    );
    expect(intelligenceViewModel(false)).toMatchObject({
      priceHeading: "Price needs your input",
      reviewRequired: true,
      manualEntryAvailable: true,
    });
  });

  it("renders photo-to-publish and mark-sold controls in one application", () => {
    const html = renderAppPage("http://localhost:4000");
    expect(html).toContain('id="photos"');
    expect(html).toContain("/v1/intelligence/prepare");
    expect(html).toContain("Approve and prepare publishing");
    expect(html).toContain("Mark sold once");
    expect(html).not.toContain("AI_GATEWAY_TOKEN");
  });
});
