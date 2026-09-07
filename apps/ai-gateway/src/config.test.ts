import { describe, expect, it } from "vitest";
import { loadGatewayConfig } from "./config.js";

const base = {
  AI_PROVIDER: "self_hosted",
  AI_RUNTIME: "ollama",
  AI_BASE_URL: "http://127.0.0.1:11434",
  AI_TEXT_MODEL: "local-text",
  AI_VISION_MODEL: "local-vision",
  AI_EMBEDDING_MODEL: "local-embedding",
  AI_GATEWAY_TOKEN: "a-private-internal-token-with-32-plus-characters",
};

describe("gateway configuration", () => {
  it("accepts an explicitly self-hosted local runtime", () => {
    expect(loadGatewayConfig(base).provider.runtime).toBe("ollama");
  });

  it("rejects a paid provider mode or endpoint instead of falling back", () => {
    expect(() =>
      loadGatewayConfig({ ...base, AI_PROVIDER: "external" }),
    ).toThrow(/must be self_hosted/);
    expect(() =>
      loadGatewayConfig({
        ...base,
        AI_RUNTIME: "openai_compatible",
        AI_BASE_URL: "https://api.openai.com",
      }),
    ).toThrow(/forbidden/);
  });
});
