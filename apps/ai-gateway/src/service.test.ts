import { describe, expect, it } from "vitest";
import {
  GATEWAY_PROTOCOL_VERSION,
  ModelUnavailableError,
  type SelfHostedModelProvider,
} from "@sellfuse/ai-gateway";
import { GatewayService } from "./service.js";

const token = "internal-test-token-that-is-at-least-32-characters";
const request = {
  version: GATEWAY_PROTOCOL_VERSION,
  tenantId: "sellfuse",
  traceId: "d25fa697-d32c-4a12-a0fe-e84739bc5855",
  modelRole: "TEXT_MODEL" as const,
  messages: [{ role: "user" as const, content: "test" }],
  temperature: 0,
  maxTokens: 64,
};

function provider(fail = false): SelfHostedModelProvider {
  return {
    runtime: "mock",
    async infer() {
      if (fail) throw new ModelUnavailableError();
      return { content: "{}", durationMs: 1 };
    },
    async embed(input) {
      return { embeddings: input.input.map(() => [0.1]), durationMs: 1 };
    },
    async health() {
      return !fail;
    },
  };
}

describe("private Nader AI Gateway", () => {
  it("requires internal bearer authentication", async () => {
    const gateway = new GatewayService(token, provider());
    expect(
      (
        await gateway.handle({
          method: "POST",
          path: "/v1/inference",
          body: request,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await gateway.handle({
          method: "POST",
          path: "/v1/inference",
          authorization: `Bearer ${token}`,
          body: request,
        })
      ).status,
    ).toBe(200);
    expect(
      (await gateway.handle({ method: "GET", path: "/health" })).status,
    ).toBe(401);
  });

  it("returns a sanitized unavailable response without fallback", async () => {
    const gateway = new GatewayService(token, provider(true));
    const response = await gateway.handle({
      method: "POST",
      path: "/v1/inference",
      authorization: `Bearer ${token}`,
      body: request,
    });
    expect(response).toEqual({
      status: 503,
      body: { error: "MODEL_UNAVAILABLE" },
    });
  });

  it("rejects images whose bytes do not match their declared type", async () => {
    const gateway = new GatewayService(token, provider());
    const response = await gateway.handle({
      method: "POST",
      path: "/v1/inference",
      authorization: `Bearer ${token}`,
      body: {
        ...request,
        modelRole: "VISION_MODEL",
        images: [
          {
            mimeType: "image/jpeg",
            base64: Buffer.from("this is not a jpeg").toString("base64"),
          },
        ],
      },
    });
    expect(response).toEqual({
      status: 400,
      body: { error: "INVALID_REQUEST" },
    });
  });
});
