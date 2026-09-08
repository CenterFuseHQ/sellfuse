# CenterFuse implementation plan

1. Preserve `apps/web` and the SellFuse API contracts while introducing shared packages alongside them.
2. Add independently runnable CenterFuse and BuyFuse applications using the existing Node/TypeScript/npm-workspace stack.
3. Move identity rules behind a shared entitlement-aware boundary without invalidating the SellFuse issuer/audience.
4. Add provider capability, canonical publication, database ownership, UI, configuration, telemetry, and AI facades only where code is genuinely shared.
5. Verify all existing and new workspaces together and document operational boundaries.

This is an incremental monorepo evolution; moving SellFuse directories is deliberately deferred because it would add deployment risk without improving product isolation.
