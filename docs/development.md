# Internal developer setup

## Install and environment

Use Node.js 20.9+ and npm. Run `npm install`, copy `.env.example` to `.env`, and replace the development placeholders. Keep `AUTH_SECRET`, `JWT_SECRET`, `AI_GATEWAY_TOKEN`, runtime tokens, and market-data tokens server-side. Do not prefix secrets with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.

PostgreSQL and Ollama can run with `docker compose up postgres ollama`. The migration in `packages/database/migrations` is additive; apply it through the database change process for the target environment. The current application persistence adapters are in-memory, so applying the schema does not by itself switch runtime storage.

## Run

| Command | Result |
| --- | --- |
| `npm run dev` | All product apps plus SellFuse API and gateway; loads root `.env` |
| `npm run dev:centerfuse` | Parent site on configured `PORT` or 3000 |
| `npm run dev:sellfuse` | SellFuse web on configured `PORT` or 3001 |
| `npm run dev:buyfuse` | BuyFuse app/API on configured `PORT` or 3002 |
| `npm run dev:api` | SellFuse API on `API_PORT` or 4000 |
| `npm run dev:gateway` | Nader AI Gateway on `AI_GATEWAY_PORT` or 8787 |

Individual workspace commands inherit the current shell environment. The aggregate command reads `.env` first.

## Verify

Use `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. `npm run check` runs the main four checks together. Run `npm run security:ai`, `npm run audit`, and `docker compose config --quiet` for the repository security/configuration checks.
