import { describe, expect, it } from "vitest";
import { intelligenceViewModel, SELLFUSE_STEPS } from "./workflow.js";

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
});
