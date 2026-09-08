# CenterFuse ecosystem

CenterFuse is the parent for a family of focused commerce products:

- **SellFuse** is the existing seller-side application. It identifies an item from photos, keeps AI reasoning separate from market evidence, prepares one canonical listing for selected destinations, and supports a mark-sold-once workflow.
- **BuyFuse** is a buyer-side workspace for keeping items, source links, notes, and purchase status organized.

The products share intentional infrastructure—identity and entitlements, product configuration, design primitives, integration contracts, AI protocol, analytics/notifications abstractions, and database ownership conventions—while retaining independent entrypoints and deployment boundaries.

## Applications

| Application | Workspace | Default URL | Purpose |
| --- | --- | --- | --- |
| CenterFuse | `@centerfuse/home` | `http://localhost:3000` | Parent site and product navigation |
| SellFuse | `@sellfuse/web` | `http://localhost:3001` | Existing seller workflow |
| BuyFuse | `@centerfuse/buyfuse` | `http://localhost:3002` | Buyer workspace |
| SellFuse API | `@sellfuse/api` | `http://localhost:4000` | Auth, intelligence, listings, and publication workflow |
| Nader AI Gateway | `@sellfuse/ai-gateway-server` | `http://localhost:8787` | Private authenticated access to self-hosted models |

## Quick start

Requirements: Node.js 20.9+, npm 10+, and optionally Ollama or Docker for local AI.

```bash
npm install
copy .env.example .env
npm run dev
```

`npm run dev` loads `.env` and starts the three product applications, SellFuse API, and AI gateway. Individual commands are `dev:centerfuse`, `dev:sellfuse`, `dev:buyfuse`, `dev:api`, and `dev:gateway`.

AI is self-hosted and optional to the listing workflow. There is no OpenAI, Anthropic, Gemini, Bedrock, or other paid inference dependency or silent fallback. When local inference is unavailable, SellFuse exposes the manual workflow. To enable Ollama:

```bash
ollama pull qwen3:8b
ollama pull gemma3:4b
ollama pull embeddinggemma
```

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run security:ai
npm run audit
docker compose config --quiet
```

Read [developer setup](docs/development.md), the [CenterFuse architecture decision](docs/architecture/centerfuse-ecosystem.md), [deployment boundaries](docs/deployment.md), [self-hosted AI](docs/self-hosted-ai.md), [market evidence](docs/market-evidence.md), and the [marketplace capability matrix](docs/marketplace-capability-matrix.md).

## Current boundaries

- Marketplace actions use official APIs only when authorized and implemented. Today, initial destinations remain explicit assisted handoffs; planned eBay/Pinterest API capabilities are not reported as available.
- Market evidence comes only from user input or configured, allow-listed data sources. Models cannot invent comparable sales or final price evidence.
- The checked-in database migration is additive and production-oriented, but current application repositories remain in-memory development adapters until database wiring is introduced.
- Product URLs are configuration values. Repository names do not imply domain ownership.
