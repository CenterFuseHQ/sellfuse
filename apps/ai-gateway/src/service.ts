import { timingSafeEqual } from "node:crypto";
import {
  EmbeddingRequestSchema,
  GATEWAY_PROTOCOL_VERSION,
  InferenceRequestSchema,
  ModelTimeoutError,
  ModelUnavailableError,
  type SelfHostedModelProvider,
} from "@sellfuse/ai-gateway";
import { assertValidImages } from "@sellfuse/validation";

export interface GatewayHttpRequest {
  method: string;
  path: string;
  authorization?: string;
  body?: unknown;
}
export interface GatewayHttpResponse {
  status: number;
  body: unknown;
}

class Semaphore {
  private active = 0;
  constructor(private readonly maximum: number) {}
  async use<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.maximum) throw new Error("GATEWAY_BUSY");
    this.active++;
    try {
      return await work();
    } finally {
      this.active--;
    }
  }
}

export class GatewayService {
  private readonly semaphore: Semaphore;
  constructor(
    private readonly token: string,
    private readonly provider: SelfHostedModelProvider,
    maxConcurrency = 2,
    private readonly maxImageBytes = 8 * 1024 * 1024,
  ) {
    if (token.length < 32) throw new Error("Gateway token is too short");
    this.semaphore = new Semaphore(maxConcurrency);
  }

  async handle(request: GatewayHttpRequest): Promise<GatewayHttpResponse> {
    if (request.method === "GET" && request.path === "/health") {
      const healthy = await this.provider.health();
      return {
        status: healthy ? 200 : 503,
        body: { status: healthy ? "ok" : "unavailable" },
      };
    }
    if (!this.authenticated(request.authorization))
      return { status: 401, body: { error: "UNAUTHORIZED" } };
    if (request.method !== "POST")
      return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
    try {
      if (request.path === "/v1/inference") {
        const input = InferenceRequestSchema.parse(request.body);
        assertValidImages(input.images ?? [], this.maxImageBytes, 8);
        const output = await this.semaphore.use(() =>
          this.provider.infer(input),
        );
        return {
          status: 200,
          body: {
            version: GATEWAY_PROTOCOL_VERSION,
            traceId: input.traceId,
            modelRole: input.modelRole,
            ...output,
          },
        };
      }
      if (request.path === "/v1/embeddings") {
        const input = EmbeddingRequestSchema.parse(request.body);
        const output = await this.semaphore.use(() =>
          this.provider.embed(input),
        );
        return {
          status: 200,
          body: {
            version: GATEWAY_PROTOCOL_VERSION,
            traceId: input.traceId,
            ...output,
          },
        };
      }
      return { status: 404, body: { error: "NOT_FOUND" } };
    } catch (error) {
      if (error instanceof ModelTimeoutError)
        return { status: 504, body: { error: "MODEL_TIMEOUT" } };
      if (error instanceof ModelUnavailableError)
        return { status: 503, body: { error: "MODEL_UNAVAILABLE" } };
      if (error instanceof Error && error.message === "GATEWAY_BUSY")
        return { status: 429, body: { error: "GATEWAY_BUSY" } };
      return { status: 400, body: { error: "INVALID_REQUEST" } };
    }
  }

  private authenticated(header?: string): boolean {
    const candidate = header?.startsWith("Bearer ") ? header.slice(7) : "";
    const actual = Buffer.from(candidate);
    const expected = Buffer.from(this.token);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
