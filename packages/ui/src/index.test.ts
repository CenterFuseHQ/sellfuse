import { describe, expect, it } from "vitest";
import { PRODUCTS, resolveProductUrls } from "@centerfuse/config";
import { escapeHtml, renderDocument, renderFamilyHeader, renderState } from "./index.js";

describe("CenterFuse design system", () => {
  it("renders accessible shared navigation and states safely", () => {
    const urls = resolveProductUrls({});
    expect(renderFamilyHeader("BUYFUSE", urls)).toContain('aria-current="page"');
    expect(renderState("error", "Problem", "Try again")).toContain('role="alert"');
    expect(escapeHtml('<script>alert("x")</script>')).not.toContain("<script>");
  });

  it("renders product metadata and a favicon", () => {
    const page = renderDocument({ product: PRODUCTS.CENTERFUSE, title: "CenterFuse", description: "Parent product", body: "<main></main>" });
    expect(page).toContain('name="description"');
    expect(page).toContain('rel="icon"');
  });
});
