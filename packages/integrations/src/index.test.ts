import { describe, expect, it, vi } from "vitest";
import { IntegrationError, ProviderRegistry, withIntegrationRetry } from "./index.js";

describe("integration provider boundary", () => {
  const registry = new ProviderRegistry([{ id: "manual", displayName: "Manual", availability: "MANUAL_ONLY" as const, capabilities: [], plannedCapabilities: ["LISTINGS_CREATE" as const], manualWorkflows: ["LISTINGS_CREATE"], disclosure: "User completes publication." }]);
  it("does not report planned or manual actions as available", () => expect(registry.supports("manual", "LISTINGS_CREATE")).toBe(false));
  it("retries only retryable failures with one idempotency key", async () => {
    const operation = vi.fn().mockRejectedValueOnce(new IntegrationError("RATE_LIMIT", "Try again", true)).mockResolvedValue("ok");
    await expect(withIntegrationRetry(operation, { idempotencyKey: "listing-1" })).resolves.toBe("ok");
    expect(operation.mock.calls.map(([value]) => value.idempotencyKey)).toEqual(["listing-1", "listing-1"]);
  });
  it("preserves a safe provider error instead of fabricating success", async () => {
    await expect(withIntegrationRetry(async () => { throw new Error("token=secret"); }, { idempotencyKey: "x" })).rejects.toMatchObject({ code: "PROVIDER_FAILURE", message: "The integration provider failed." });
  });
});
