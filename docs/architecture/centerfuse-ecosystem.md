# ADR: independent CenterFuse product repositories

Status: accepted

## Decision

CenterFuse is the umbrella product and ecosystem. SellFuse and BuyFuse are sibling products, and all three source trees are independent repositories under the `CenterFuseHQ` GitHub organization:

- `CenterFuseHQ/centerfuse`
- `CenterFuseHQ/sellfuse`
- `CenterFuseHQ/buyfuse`

No repository imports source files from a sibling checkout. Product navigation uses configured URLs. Small configuration and HTML design primitives are repository-local so builds remain deterministic and do not depend on unpublished packages.

## SellFuse boundaries

SellFuse retains its web, API, mobile, self-hosted AI gateway, seller domain, validation, marketplace adapters, and compatibility auth facade. The existing token issuer and audience remain `sellfuse` and `sellfuse-api`; repository separation does not migrate accounts or token semantics.

The `@centerfuse/config`, `@centerfuse/ui`, `@centerfuse/auth`, `@centerfuse/integrations`, and `@centerfuse/ai` package names denote ecosystem-facing package boundaries inside this repository. They are private npm workspaces, not filesystem references to the CenterFuse repository.

## Data ownership

The single additive migration defining the `centerfuse`, `sellfuse`, and `buyfuse` PostgreSQL schemas is owned by the CenterFuse platform repository. It is intentionally not copied into SellFuse or BuyFuse, preventing the same migration from being run independently by multiple deployments. SellFuse's runtime persistence adapters remain in-memory until a separately reviewed database integration is connected.

## Deployment

SellFuse web, API, and AI gateway remain separate processes with independent Dockerfiles. CenterFuse and BuyFuse have their own CI and deployment configurations. Sibling URLs and origins are environment configuration, not local path assumptions or invented production domains.
