import { z } from "zod";

export const GATEWAY_PROTOCOL_VERSION = "2026-01-01" as const;

export const GatewayImageSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(16),
});

export const GatewayMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(30_000),
});

export const InferenceRequestSchema = z.object({
  version: z.literal(GATEWAY_PROTOCOL_VERSION),
  tenantId: z.string().min(1).max(100),
  traceId: z.string().uuid(),
  modelRole: z.enum(["TEXT_MODEL", "VISION_MODEL"]),
  messages: z.array(GatewayMessageSchema).min(1).max(20),
  images: z.array(GatewayImageSchema).max(8).optional(),
  responseSchema: z.record(z.string(), z.unknown()).optional(),
  temperature: z.number().min(0).max(1).default(0),
  maxTokens: z.number().int().min(32).max(8192).default(2048),
});

export const InferenceResponseSchema = z.object({
  version: z.literal(GATEWAY_PROTOCOL_VERSION),
  traceId: z.string().uuid(),
  modelRole: z.enum(["TEXT_MODEL", "VISION_MODEL"]),
  content: z.string(),
  durationMs: z.number().nonnegative(),
});

export const EmbeddingRequestSchema = z.object({
  version: z.literal(GATEWAY_PROTOCOL_VERSION),
  tenantId: z.string().min(1).max(100),
  traceId: z.string().uuid(),
  input: z.array(z.string().min(1).max(10_000)).min(1).max(100),
});

export const EmbeddingResponseSchema = z.object({
  version: z.literal(GATEWAY_PROTOCOL_VERSION),
  traceId: z.string().uuid(),
  embeddings: z.array(z.array(z.number())),
  durationMs: z.number().nonnegative(),
});

export type InferenceRequest = z.infer<typeof InferenceRequestSchema>;
export type InferenceResponse = z.infer<typeof InferenceResponseSchema>;
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;
export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;
