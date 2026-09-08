# Nader AI Gateway protocol

The protocol is deliberately product-neutral so CenterFuse products, NaderStudio, and SmartQuote can share inference infrastructure without sharing prompts, users, rate limits, or application data. `@centerfuse/ai` is the product-facing facade; the transport implementation remains replaceable.

## Trust boundary

Clients never call a model server. An application API calls `POST /v1/inference` or `POST /v1/embeddings` with an internal bearer credential. Production traffic should also use private networking, TLS, workload identity or short-lived service credentials, and a reverse proxy. The gateway must not be bound directly to a public interface.

## Inference request

Requests carry a protocol version, tenant identifier, trace identifier, model role (`TEXT_MODEL` or `VISION_MODEL`), messages, optional inline images, and an optional JSON Schema. The gateway selects the configured model for that role and returns only generated content plus non-sensitive timing metadata.

The current protocol version is `2026-01-01`. Adding a runtime requires implementing `SelfHostedModelProvider`; business code does not change.

## Data handling

- Authorization headers and request bodies are redacted from logs.
- Full prompts, photos, and completions are not logged.
- Images are MIME-checked, decoded, size-limited, and limited by count.
- Errors are mapped to stable codes without upstream payloads.
- The gateway applies per-client rate limits, timeouts, and a concurrency semaphore.
