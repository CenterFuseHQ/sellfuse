# SellFuse

**List once. Sell everywhere.**

SellFuse is a consumer-first selling assistant that turns photos and seller-provided facts into reviewed, marketplace-specific listing drafts. AI is optional: every listing can be created and published through supported assisted workflows without inference.

The intelligence flow is part of listing creation—not a separate appraisal product:

```text
Photo → identify → attributes + visible condition → missing facts
      → allowed market-data sources → evidence-backed value
      → master listing → marketplace drafts → review → publish → mark sold once
```

Model reasoning and market evidence are stored separately. The model cannot create comparables or set final price numbers. When no reliable evidence exists, SellFuse returns null price recommendations and asks the seller to enter a price or add verifiable evidence.

## Architecture

```text
Web / Expo mobile
       │
       ▼
SellFuse API ── business rules, auth, drafts, marketplace permissions
       │ authenticated internal protocol
       ▼
Nader AI Gateway ── timeouts, schemas, concurrency, runtime adapters
       │
       ├── Ollama (local)
       ├── vLLM (production option)
       └── llama.cpp (edge/CPU option)
```

There is no OpenAI, Anthropic, Gemini, Bedrock, or other paid inference dependency. Self-hosting removes per-request third-party inference fees, not hardware, electricity, operations, or hosting costs.

## Quick start

Requirements: Node.js 20.9+, npm 10+, and optionally Ollama or Docker.

```bash
npm install
copy .env.example .env
npm run dev:gateway
npm run dev:api
npm run dev:web
```

In a separate terminal, install the configured local models:

```bash
ollama pull qwen3:8b
ollama pull gemma3:4b
ollama pull embeddinggemma
```

The manual listing workflow works when Ollama is stopped. See [Self-hosted AI](docs/self-hosted-ai.md), [gateway protocol](docs/ai-gateway-protocol.md), and the [marketplace capability matrix](docs/marketplace-capability-matrix.md).

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run audit
npm run security:ai
```

## Important MVP boundaries

- Marketplace adapters are capability-aware. eBay and Pinterest have official publishing APIs, but real credentials are not configured or claimed as tested in this repository.
- Other initial marketplaces use explicit assisted or unavailable states; no scraping, session-cookie reuse, CAPTCHA bypass, or password collection exists.
- Market-data connectors are a separate allow-listed interface. This repository ships no unlicensed scraping connector and makes no claim of live sold-data access.
- The included API persistence is an in-memory development adapter. The relational production model is specified in `apps/api/prisma/schema.prisma` and should be wired to PostgreSQL before production deployment.
- Legal pages are product-ready placeholders and require counsel review before launch.
