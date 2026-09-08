# Deployment boundaries

Deploy the CenterFuse home, SellFuse web, BuyFuse, SellFuse API, and Nader AI Gateway as independent processes. Keep the existing hosting provider and CI approach; this repository does not require a cloud migration.

- CenterFuse: build/start workspace `@centerfuse/home`; Dockerfile `apps/centerfuse/Dockerfile`.
- SellFuse: build/start workspace `@sellfuse/web`; Dockerfile `apps/web/Dockerfile`; configure `SELLFUSE_API_URL` server-side in its process.
- BuyFuse: build/start workspace `@centerfuse/buyfuse`; Dockerfile `apps/buyfuse/Dockerfile`; set a secrets-manager-backed `AUTH_SECRET` in production.
- SellFuse API: workspace `@sellfuse/api`; Dockerfile `apps/api/Dockerfile`; restrict `WEB_ORIGIN` to the SellFuse origin and keep `JWT_SECRET` and gateway token secret.
- AI gateway: existing Docker/Compose boundary; expose it only to internal callers and require `AI_GATEWAY_TOKEN`.

Set `CENTERFUSE_URL`, `SELLFUSE_URL`, and `BUYFUSE_URL` for family navigation. These values are configuration and make no assumption that a domain has been acquired. Terminate TLS at the platform/load balancer, use separate health checks, and do not expose Ollama/vLLM/llama.cpp publicly.
