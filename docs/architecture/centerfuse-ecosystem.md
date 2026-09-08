# ADR: CenterFuse product ecosystem

Status: accepted

## Decision

CenterFuse is the parent product and shared ownership boundary. SellFuse remains the seller product in its existing `apps/web`, `apps/api`, and domain workspaces. BuyFuse is an independent sibling application with its own domain package. Future products can add an `apps/<product>` entrypoint and product domain package, then opt into shared packages without importing another product's domain.

The existing npm workspace monorepo is retained. This avoids a package-manager or framework migration and preserves SellFuse history and deployment assumptions.

## Boundaries

| Area | Owner | Rule |
| --- | --- | --- |
| Product metadata and URLs | `@centerfuse/config` | Names, types, colors, ports, and configurable URLs live in one registry. |
| UI primitives | `@centerfuse/ui` | Family navigation, tokens, controls, cards, dialogs, feedback states, and document metadata. Product screens own their workflows. |
| Identity and authorization | `@centerfuse/auth` | One identity model carries product entitlements. SellFuse keeps its legacy token issuer/audience through a compatibility facade. |
| Database contracts | `@centerfuse/database` | `centerfuse`, `sellfuse`, and `buyfuse` PostgreSQL schemas make ownership explicit. Migration 0001 is additive. |
| Integrations | `@centerfuse/integrations` | Registry, capability vocabulary, safe errors, retries, and idempotency are shared. Provider-specific payloads stop at adapters. |
| SellFuse marketplaces | `@sellfuse/marketplace-adapters` | Accurate current/manual/planned capability mapping and marketplace-specific transforms. |
| AI protocol | `@centerfuse/ai` | Shared facade over the reusable authenticated Nader AI Gateway protocol. Product prompts and policy stay in SellFuse domain code. |
| Analytics and notifications | `@centerfuse/platform` | Provider-neutral interfaces with no-op and test adapters. |
| BuyFuse domain | `@centerfuse/buyfuse-domain` | Buyer workspace types, validation, repository contract, permission checks, and application service. |

## Identity and data ownership

`centerfuse.users` is the eventual canonical identity record. Organizations, memberships, product entitlements, and integration connection references are shared. Product records reference that identity but live in product schemas. Integration rows store only an encrypted token reference; plaintext provider credentials do not belong in product tables.

The current in-memory SellFuse account store is not destructively migrated. Its facade now uses the shared token and entitlement implementation while retaining its issuer and audience. Durable persistence can be connected behind the service interfaces with an additive migration and an explicit account-linking rollout.

## Listings and synchronization

A SellFuse canonical listing owns the seller's core content, media references, fulfillment information, and review state. Each destination has a channel-publication record containing overrides, an external ID only when one actually exists, an idempotency key, sync state, timestamps, and sanitized provider error details. Assisted publication is `ACTION_REQUIRED`, never `SYNCED`. Mark-sold creates explicit provider/manual follow-up states rather than claiming remote success.

## AI

The SellFuse API calls the private Nader AI Gateway with internal bearer authentication. The gateway selects self-hosted Ollama, vLLM, llama.cpp, or a compatible runtime. No browser receives gateway credentials. There is no paid-provider fallback. Structured responses are validated; market-data connectors are separate and allow-listed; model reasoning cannot become sold-comparable evidence. Mock gateway implementations cover automated tests and manual input remains available when local inference fails.

## Deployment

CenterFuse, SellFuse, BuyFuse, the SellFuse API, and the AI gateway are separate processes. Product URLs and origins are environment configuration, not hardcoded production domains. The existing Docker Compose infrastructure remains intact, and the new web applications have independent Dockerfiles. No cloud-provider change is required.

## Adding a product

Add the product metadata to `@centerfuse/config`, define its permissions/entitlement in `@centerfuse/auth`, create a product-owned domain package and application entrypoint, and add an owned database schema migration if persistence is needed. Shared packages must not depend on a product domain.
