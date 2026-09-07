import { randomUUID } from "node:crypto";
import {
  EmbeddingResponseSchema,
  GATEWAY_PROTOCOL_VERSION,
  InferenceResponseSchema,
  type EmbeddingResponse,
  type InferenceRequest,
  type InferenceResponse,
} from "./protocol.js";

export class GatewayUnavailableError extends Error {
  readonly code = "AI_TEMPORARILY_UNAVAILABLE";
  constructor() {
    super(
      "AI assistance is temporarily unavailable. Your draft is safe and you can continue manually.",
    );
    this.name = "GatewayUnavailableError";
  }
}

export interface GatewayClientOptions {
  baseUrl: string;
  token: string;
  tenantId: string;
  timeoutMs?: number;
}

export interface AiGateway {
  infer(
    input: Omit<InferenceRequest, "version" | "tenantId" | "traceId">,
  ): Promise<InferenceResponse>;
  embed(input: string[]): Promise<EmbeddingResponse>;
}

export class HttpAiGatewayClient implements AiGateway {
  constructor(private readonly options: GatewayClientOptions) {}

  async infer(
    input: Omit<InferenceRequest, "version" | "tenantId" | "traceId">,
  ): Promise<InferenceResponse> {
    const traceId = randomUUID();
    const payload = await this.post("/v1/inference", {
      ...input,
      version: GATEWAY_PROTOCOL_VERSION,
      tenantId: this.options.tenantId,
      traceId,
    });
    const parsed = InferenceResponseSchema.safeParse(payload);
    if (!parsed.success) throw new GatewayUnavailableError();
    return parsed.data;
  }

  async embed(input: string[]): Promise<EmbeddingResponse> {
    const traceId = randomUUID();
    const payload = await this.post("/v1/embeddings", {
      version: GATEWAY_PROTOCOL_VERSION,
      tenantId: this.options.tenantId,
      traceId,
      input,
    });
    const parsed = EmbeddingResponseSchema.safeParse(payload);
    if (!parsed.success) throw new GatewayUnavailableError();
    return parsed.data;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    try {
      const response = await fetch(
        `${this.options.baseUrl.replace(/\/$/, "")}${path}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.options.token}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.options.timeoutMs ?? 50_000),
        },
      );
      if (!response.ok) throw new GatewayUnavailableError();
      return await response.json();
    } catch (error) {
      if (error instanceof GatewayUnavailableError) throw error;
      throw new GatewayUnavailableError();
    }
  }
}
