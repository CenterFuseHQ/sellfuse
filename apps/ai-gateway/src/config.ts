import {
  OllamaProvider,
  OpenAICompatibleSelfHostedProvider,
  type SelfHostedModelProvider,
  type SelfHostedProviderOptions,
} from "@sellfuse/ai-gateway";

const forbiddenHosts = new Set([
  "api.openai.com",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "bedrock-runtime.amazonaws.com",
]);

export interface GatewayConfig {
  port: number;
  host: string;
  token: string;
  maxConcurrency: number;
  provider: SelfHostedModelProvider;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  key: string,
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error(`${key} must be a positive integer`);
  return parsed;
}

export function loadGatewayConfig(env: NodeJS.ProcessEnv): GatewayConfig {
  if (required(env, "AI_PROVIDER") !== "self_hosted")
    throw new Error(
      "AI_PROVIDER must be self_hosted; third-party fallback is forbidden",
    );
  const token = required(env, "AI_GATEWAY_TOKEN");
  if (token.length < 32)
    throw new Error("AI_GATEWAY_TOKEN must contain at least 32 characters");
  const runtime = required(env, "AI_RUNTIME");
  if (runtime !== "ollama" && runtime !== "openai_compatible")
    throw new Error("AI_RUNTIME must be ollama or openai_compatible");
  const baseUrl = new URL(required(env, "AI_BASE_URL"));
  if (forbiddenHosts.has(baseUrl.hostname.toLowerCase()))
    throw new Error("Paid external AI endpoints are forbidden");
  if (!new Set(["http:", "https:"]).has(baseUrl.protocol))
    throw new Error("AI_BASE_URL must use HTTP or HTTPS");
  const options: SelfHostedProviderOptions = {
    baseUrl: baseUrl.toString(),
    textModel: required(env, "AI_TEXT_MODEL"),
    visionModel: required(env, "AI_VISION_MODEL"),
    embeddingModel: required(env, "AI_EMBEDDING_MODEL"),
    timeoutMs: positiveInteger(
      env.AI_REQUEST_TIMEOUT_MS,
      45_000,
      "AI_REQUEST_TIMEOUT_MS",
    ),
    ...(env.AI_RUNTIME_TOKEN ? { runtimeToken: env.AI_RUNTIME_TOKEN } : {}),
  };
  return {
    port: positiveInteger(env.AI_GATEWAY_PORT, 8787, "AI_GATEWAY_PORT"),
    host: env.AI_GATEWAY_HOST?.trim() || "127.0.0.1",
    token,
    maxConcurrency: positiveInteger(
      env.AI_MAX_CONCURRENCY,
      2,
      "AI_MAX_CONCURRENCY",
    ),
    provider:
      runtime === "ollama"
        ? new OllamaProvider(options)
        : new OpenAICompatibleSelfHostedProvider(options),
  };
}
