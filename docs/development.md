# Internal developer setup

## Install and environment

Use Node.js 20.9+ and npm. Run `npm ci`, copy `.env.example` to `.env`, and replace the development placeholders. Keep `JWT_SECRET`, `AI_GATEWAY_TOKEN`, runtime tokens, and market-data tokens server-side. Do not prefix secrets with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.

PostgreSQL and Ollama can run with `docker compose up postgres ollama`. The current application persistence adapters are in-memory. The additive cross-product database migration is owned by [CenterFuseHQ/centerfuse](https://github.com/CenterFuseHQ/centerfuse) and must be applied once through the platform database change process; it is not duplicated in this repository.

## Run

| Command | Result |
| --- | --- |
| `npm run dev` | SellFuse web, API, and gateway; loads root `.env` |
| `npm run dev:sellfuse` | SellFuse web on configured `PORT` or 3001 |
| `npm run dev:api` | SellFuse API on `API_PORT` or 4000 |
| `npm run dev:gateway` | Nader AI Gateway on `AI_GATEWAY_PORT` or 8787 |
| `npm run dev:mobile` | SellFuse mobile entrypoint |

Individual workspace commands inherit the current shell environment. The aggregate command reads `.env` first.

## Verify

Use `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. `npm run check` runs the main four checks together. Run `npm run security:ai`, `npm run audit`, and `docker compose config --quiet` (with `AI_GATEWAY_TOKEN` set) for the repository security/configuration checks.
