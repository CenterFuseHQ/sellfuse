# Self-hosted AI architecture

## Local AI development

Set `AI_RUNTIME=ollama` and keep `AI_BASE_URL=http://localhost:11434` on the gateway host. Ollama is never contacted by a browser or mobile client. Pull the text, vision, and embedding models named in environment configuration, then start `apps/ai-gateway` before `apps/api`.

The defaults are starting points, not permanent product decisions:

- Text: `qwen3:8b` for instruction following and structured listing JSON.
- Vision: `gemma3:4b` for common-item description and visible-condition evidence.
- Embeddings: `embeddinggemma` for future semantic category/search features.

Evaluate models on a synthetic, versioned SellFuse dataset before changing a production alias. Never scatter model names into prompts or business logic.

## Self-hosted production architecture

Run the gateway on a private subnet behind an authenticated reverse proxy. A typical production runtime is vLLM on one or more GPU nodes; llama.cpp is suitable for smaller quantized models and CPU/GPU hybrid deployments. Configure `AI_RUNTIME=openai_compatible` for either and point `AI_BASE_URL` to its private `/v1` endpoint. The implementation uses raw HTTP and does not require or call any paid provider SDK.

vLLM's own API-key flag does not cover every endpoint, so network isolation and a proxy ACL are required. Ollama should likewise never be exposed directly to the internet.

## Model requirements

### Text model

- Commercially acceptable model license for the intended deployment.
- Reliable instruction following and JSON Schema-constrained output.
- Context capacity for the master listing plus marketplace constraints.
- Consistent refusal to manufacture unprovided facts.

### Vision model

- Multi-image input.
- Visible-object, attribute, damage, and uncertainty recognition.
- Confidence calibration evaluated by category.
- No exact brand/model assertion without visible or user-provided evidence.

### Embedding model

- Stable dimensionality across an index version.
- Strong short-product-text retrieval quality.
- Versioned indexes whenever the model changes.

## Resource requirements

Memory needs depend on model size, quantization, context, batch size, and runtime. As a rough planning rule, a 4-bit 8B model needs several GB for weights plus KV cache and runtime overhead; measure the chosen artifact rather than promising a universal number.

- CPU-only: lowest infrastructure barrier, highest latency; useful for development and low traffic.
- Consumer GPU: practical local iteration for quantized small/medium models.
- Datacenter GPU: higher concurrency and predictable latency with vLLM continuous batching.

Self-hosting avoids third-party per-request AI charges but still incurs hardware, electricity, hosting, monitoring, maintenance, and engineering costs.

## Structured output and safety

Every decision-bearing result is parsed and validated with Zod. One controlled repair attempt is allowed after invalid JSON/schema output. Invalid output after that fails closed. Brand/model assertions below the confidence threshold or without visible/user evidence are removed and surfaced as missing information.

Price suggestions consume only seller-provided or separately supplied comparable evidence. `AllowedMarketDataRetriever` is a separate, allow-listed boundary from inference. Model output can select supplied evidence IDs and explain relevance, but price values are computed deterministically from validated records. Unknown IDs and model-generated price fields are rejected. With no evidence, the service returns null prices plus an `AI_ESTIMATE_ONLY` marker that explicitly says identification is not market evidence.

## Manual fallback

AI is optional. A gateway outage, timeout, invalid output, or overloaded model returns a sanitized `AI_TEMPORARILY_UNAVAILABLE` response. Existing draft data remains unchanged, and the user can enter title, description, category, and price manually.

## On-device boundary

`LocalPhotoHeuristics` is a separate interface intended for blur/exposure scoring and duplicate hashes. It does not share the remote gateway abstraction. Future native or WebAssembly implementations can move inexpensive work on-device without moving prompts or private model credentials into clients.

## Model upgrades

1. Register a new model alias in a staging gateway.
2. Run schema validity, hallucination, confidence, latency, and category evaluation suites.
3. Record model license, digest, quantization, runtime, and prompt version.
4. Canary by tenant/rate-limited route.
5. Roll back by environment alias; no SellFuse deployment is required.

## Privacy, security, and scaling

- Keep inference services private and authenticated.
- Encrypt service credentials and customer data at rest.
- Prefer ephemeral image transfer; define short retention for diagnostics with explicit opt-in.
- Scale gateway replicas separately from model workers.
- Queue expensive jobs and use per-tenant fairness limits.
- Track only request IDs, model alias, latency, token/image counts, schema success, and error code by default.

## SellFuse and the shared gateway

SellFuse owns seller authentication, listing prompts, evidence policy, marketplace rules, and data. NaderStudio owns its own equivalent concerns. The shared gateway only authenticates workloads, selects model roles, schedules inference, validates transport limits, and talks to self-hosted runtimes.
