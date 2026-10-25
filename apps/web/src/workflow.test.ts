import { describe, expect, it } from "vitest";
import { intelligenceViewModel, SELLFUSE_STEPS } from "./workflow.js";
import { renderAppPage } from "./app-page.js";

describe("consumer workflow", () => {
  it("keeps intelligence inside the end-to-end selling journey", () => {
    expect(SELLFUSE_STEPS).toEqual(expect.arrayContaining([
      "Take pictures", "Check market evidence", "Publish", "Mark sold once",
    ]));
    expect(intelligenceViewModel(false)).toMatchObject({
      priceHeading: "Price needs your input",
      reviewRequired: true,
      manualEntryAvailable: true,
    });
  });
  it("preserves protected photo-to-publish and mark-sold controls", () => {
    const html = renderAppPage("http://localhost:4000");
    expect(html).toContain('id="photos"');
    expect(html).toContain('id="auth"');
    expect(html).toContain('id="capture"');
    expect(html).toContain("/v1/intelligence/prepare");
    expect(html).toContain("Approve and prepare publishing");
    expect(html).toContain("Mark sold once");
    expect(html).not.toContain("AI_GATEWAY_TOKEN");
  });
  it("shows a distinct responsive command center with a non-publishing demo", () => {
    const html = renderAppPage("");
    expect(html).toContain('id="sf-demo-form"');
    expect(html).toContain('id="sf-demo-output"');
    expect(html).toContain('id="sf-dark"');
    expect(html).toContain("Simulated · Browser only");
    expect(html).toContain("No external requests");
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain("The SellFuse UI is live; connect its protected API");
  });
});
