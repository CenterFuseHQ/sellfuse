# SellFuse

SellFuse is the seller and reseller product in the CenterFuse ecosystem. It identifies an item from supplied photos and details, keeps AI reasoning separate from market evidence, prepares one canonical listing for selected destinations, and supports a mark-sold-once workflow.

SellFuse is an independent source repository. The umbrella site and buyer product live in sibling repositories:

- [CenterFuseHQ/centerfuse](https://github.com/CenterFuseHQ/centerfuse)
- [CenterFuseHQ/buyfuse](https://github.com/CenterFuseHQ/buyfuse)

## Applications

| Application | Workspace | Default URL | Purpose |
| --- | --- | --- | --- |
| SellFuse web | `@sellfuse/web` | `http://localhost:3001` | Seller workflow |
| SellFuse API | `@sellfuse/api` | `http://localhost:4000` | Auth, item analysis, listings, and publication workflow |
| SellFuse mobile | `@sellfuse/mobile` | n/a | Mobile entrypoint |
| Nader AI Gateway | `@sellfuse/ai-gateway-server` | `http://localhost:8787` | Private authenticated access to self-hosted models |

## Quick start

Requirements: Node.js 20.9+, npm 10+, and optionally Ollama or Docker for local AI.

```bash
npm ci
copy .env.example .env
npm run dev
```

`npm run dev` loads `.env` and starts the SellFuse web application, API, and AI gateway. The components can also be started with `dev:sellfuse`, `dev:api`, and `dev:gateway`.

AI is self-hosted and optional to the listing workflow. There is no paid inference dependency or silent fallback. When local inference is unavailable, SellFuse exposes the manual workflow.

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
```

Read [developer setup](docs/development.md), [repository boundaries](docs/architecture/centerfuse-ecosystem.md), [deployment](docs/deployment.md), [API authentication](docs/api-authentication.md), [self-hosted AI](docs/self-hosted-ai.md), [market evidence](docs/market-evidence.md), and the [marketplace capability matrix](docs/marketplace-capability-matrix.md).

## Current boundaries

- Marketplace actions use official APIs only when authorized and implemented. Initial destinations remain explicit assisted handoffs; planned capabilities are not reported as available.
- Market evidence comes only from user input or configured, allow-listed data sources. Models cannot invent comparable sales or final price evidence.
- Runtime persistence adapters remain in-memory for development. The single additive cross-product schema migration is owned by the CenterFuse platform repository and is not duplicated here.
- Product URLs are configuration values. Repository names do not imply domain ownership.
