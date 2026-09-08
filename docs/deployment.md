# SellFuse deployment boundaries

Deploy the SellFuse web application, API, and Nader AI Gateway as separate processes. Keep the existing hosting and CI approach; repository separation does not require a cloud-provider migration.

- SellFuse web: build/start workspace `@sellfuse/web`; Dockerfile `apps/web/Dockerfile`; configure `SELLFUSE_API_URL` server-side.
- SellFuse API: workspace `@sellfuse/api`; Dockerfile `apps/api/Dockerfile`; restrict `WEB_ORIGIN` to the SellFuse origin and keep `JWT_SECRET` and gateway credentials secret.
- AI gateway: workspace `@sellfuse/ai-gateway-server`; Dockerfile `apps/ai-gateway/Dockerfile`; expose it only to internal callers and require `AI_GATEWAY_TOKEN`.

Set `CENTERFUSE_URL`, `SELLFUSE_URL`, and `BUYFUSE_URL` for ecosystem navigation. These values are configuration and make no assumption that a domain has been acquired. Terminate TLS at the platform/load balancer, use separate health checks, and do not expose the model runtime publicly.

CenterFuse and BuyFuse deployments are owned by their independent repositories and are not part of the SellFuse build context.
