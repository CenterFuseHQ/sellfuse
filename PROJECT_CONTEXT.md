# Project Context

- **Project:** SellFuse
- **Owner:** Nader Abdelshahid
- **Canonical repository:** `nnabdelshahid/SellFuse`
- **Visibility:** Private and confidential
- **Purpose:** Seller-facing application and services for account, listing, catalog, operational, and assisted workflow management.
- **Verified implementation:** The monorepo contains web, mobile, API, and authenticated AI-gateway services with shared domain, validation, integration, and UI packages. The API and gateway expose data-independent liveness checks.
- **Product separation:** CenterFuse is the umbrella control surface and BuyFuse is the buyer/customer application. Seller data, operations, permissions, and internal decision support remain isolated behind explicit contracts.
- **Shared boundaries:** Authentication, product URLs, packages, adapters, and service APIs are deliberate integration points; private seller capabilities do not belong in customer-facing material.
- **Confidentiality:** Do not disclose internal sourcing, discovery, pricing, margin, resale, competitive, or unreleased intelligence strategies in public documentation, portfolio pages, demos, logs, or unauthenticated responses.
- **Security/privacy:** Keep the repository private. Never commit credentials, tokens, account data, private endpoints, or model-provider secrets.
- **Cost principle:** Prefer software Nader can own and self-host when practical, especially for costly intelligence infrastructure.

The running code, tests, and explicit configuration are authoritative when older documentation disagrees.
