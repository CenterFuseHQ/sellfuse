import type { EmbeddingRequest, InferenceRequest } from "./protocol.js";

export interface ProviderInferenceResult {
  content: string;
  durationMs: number;
}

export interface ProviderEmbeddingResult {
  embeddings: number[][];
  durationMs: number;
}

export interface SelfHostedModelProvider {
  readonly runtime: "ollama" | "openai_compatible" | "mock";
  infer(request: InferenceRequest): Promise<ProviderInferenceResult>;
  embed(request: EmbeddingRequest): Promise<ProviderEmbeddingResult>;
  health(): Promise<boolean>;
}

export interface SelfHostedProviderOptions {
  baseUrl: string;
  textModel: string;
  visionModel: string;
  embeddingModel: string;
  timeoutMs: number;
  runtimeToken?: string;
}

export class ModelUnavailableError extends Error {
  readonly code = "MODEL_UNAVAILABLE";
  constructor(message = "The self-hosted model runtime is unavailable") {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

export class ModelTimeoutError extends Error {
  readonly code = "MODEL_TIMEOUT";
  constructor() {
    super("The self-hosted model runtime timed out");
    this.name = "ModelTimeoutError";
  }
}

async function safeFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok)
      throw new ModelUnavailableError(
        `Model runtime returned HTTP ${response.status}`,
      );
    return response;
  } catch (error) {
    if (error instanceof ModelUnavailableError) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError")
      throw new ModelTimeoutError();
    throw new ModelUnavailableError();
  }
}

export class OllamaProvider implements SelfHostedModelProvider {
  readonly runtime = "ollama" as const;
  constructor(private readonly options: SelfHostedProviderOptions) {}

  async infer(request: InferenceRequest): Promise<ProviderInferenceResult> {
    const started = performance.now();
    const model =
      request.modelRole === "VISION_MODEL"
        ? this.options.visionModel
        : this.options.textModel;
    const messages = request.messages.map((message, index) => ({
      ...message,
      ...(index === request.messages.length - 1 && request.images?.length
        ? { images: request.images.map((image) => image.base64) }
        : {}),
    }));
    const response = await safeFetch(
      `${this.options.baseUrl.replace(/\/$/, "")}/api/chat`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          format: request.responseSchema ?? "json",
          options: {
            temperature: request.temperature,
            num_predict: request.maxTokens,
          },
        }),
      },
      this.options.timeoutMs,
    );
    const payload = (await response.json()) as {
      message?: { content?: string };
    };
    if (typeof payload.message?.content !== "string")
      throw new ModelUnavailableError(
        "Model runtime returned an invalid response",
      );
    return {
      content: payload.message.content,
      durationMs: Math.round(performance.now() - started),
    };
  }

  async embed(request: EmbeddingRequest): Promise<ProviderEmbeddingResult> {
    const started = performance.now();
    const response = await safeFetch(
      `${this.options.baseUrl.replace(/\/$/, "")}/api/embed`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.options.embeddingModel,
          input: request.input,
        }),
      },
      this.options.timeoutMs,
    );
    const payload = (await response.json()) as { embeddings?: number[][] };
    if (!Array.isArray(payload.embeddings))
      throw new ModelUnavailableError(
        "Embedding runtime returned an invalid response",
      );
    return {
      embeddings: payload.embeddings,
      durationMs: Math.round(performance.now() - started),
    };
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.options.baseUrl.replace(/\/$/, "")}/api/tags`,
        { signal: AbortSignal.timeout(2000) },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

export class OpenAICompatibleSelfHostedProvider
  implements SelfHostedModelProvider
{
  readonly runtime = "openai_compatible" as const;
  constructor(private readonly options: SelfHostedProviderOptions) {}

  async infer(request: InferenceRequest): Promise<ProviderInferenceResult> {
    const started = performance.now();
    const model =
      request.modelRole === "VISION_MODEL"
        ? this.options.visionModel
        : this.options.textModel;
    const lastIndex = request.messages.length - 1;
    const messages = request.messages.map((message, index) => {
      if (index !== lastIndex || !request.images?.length) return message;
      return {
        role: message.role,
        content: [
          { type: "text", text: message.content },
          ...request.images.map((image) => ({
            type: "image_url",
            image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
          })),
        ],
      };
    });
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.options.runtimeToken)
      headers.authorization = `Bearer ${this.options.runtimeToken}`;
    const response = await safeFetch(
      `${this.options.baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          response_format: request.responseSchema
            ? {
                type: "json_schema",
                json_schema: {
                  name: "sellfuse_result",
                  strict: true,
                  schema: request.responseSchema,
                },
              }
            : { type: "json_object" },
        }),
      },
      this.options.timeoutMs,
    );
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string")
      throw new ModelUnavailableError(
        "Model runtime returned an invalid response",
      );
    return { content, durationMs: Math.round(performance.now() - started) };
  }

  async embed(request: EmbeddingRequest): Promise<ProviderEmbeddingResult> {
    const started = performance.now();
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.options.runtimeToken)
      headers.authorization = `Bearer ${this.options.runtimeToken}`;
    const response = await safeFetch(
      `${this.options.baseUrl.replace(/\/$/, "")}/v1/embeddings`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.options.embeddingModel,
          input: request.input,
        }),
      },
      this.options.timeoutMs,
    );
    const payload = (await response.json()) as {
      data?: Array<{ embedding: number[] }>;
    };
    if (!Array.isArray(payload.data))
      throw new ModelUnavailableError(
        "Embedding runtime returned an invalid response",
      );
    return {
      embeddings: payload.data.map((entry) => entry.embedding),
      durationMs: Math.round(performance.now() - started),
    };
  }

  async health(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.options.runtimeToken)
        headers.authorization = `Bearer ${this.options.runtimeToken}`;
      const response = await fetch(
        `${this.options.baseUrl.replace(/\/$/, "")}/v1/models`,
        { headers, signal: AbortSignal.timeout(2000) },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
