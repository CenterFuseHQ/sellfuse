import { expect, it } from "vitest";
import { InMemoryAnalytics, StaticFeatureFlags } from "./index.js";
it("keeps shared telemetry provider-neutral", () => { const sink = new InMemoryAnalytics(); sink.record({ name: "workspace.viewed", productId: "BUYFUSE", occurredAt: new Date(0).toISOString() }); expect(sink.events).toHaveLength(1); expect(new StaticFeatureFlags().enabled("unknown", { productId: "BUYFUSE" })).toBe(false); });
