import type { AiGateway } from "./client.js";
import {
  GATEWAY_PROTOCOL_VERSION,
  type EmbeddingResponse,
  type InferenceRequest,
  type InferenceResponse,
} from "./protocol.js";

export class MockAiGateway implements AiGateway {
  readonly requests: Array<
    Omit<InferenceRequest, "version" | "tenantId" | "traceId">
  > = [];
  constructor(private readonly responses: Array<string | Error>) {}

  async infer(
    input: Omit<InferenceRequest, "version" | "tenantId" | "traceId">,
  ): Promise<InferenceResponse> {
    this.requests.push(input);
    const next = this.responses.shift();
    if (next instanceof Error) throw next;
    if (next === undefined) throw new Error("No mock response configured");
    return {
      version: GATEWAY_PROTOCOL_VERSION,
      traceId: crypto.randomUUID(),
      modelRole: input.modelRole,
      content: next,
      durationMs: 1,
    };
  }

  async embed(input: string[]): Promise<EmbeddingResponse> {
    return {
      version: GATEWAY_PROTOCOL_VERSION,
      traceId: crypto.randomUUID(),
      embeddings: input.map(() => [0.1, 0.2]),
      durationMs: 1,
    };
  }
}
