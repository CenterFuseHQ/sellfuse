# Marketplace capability matrix

Reviewed against public official documentation on 2026-09-06. A platform's public API capability does not mean the SellFuse integration is implemented, approved, or tested.

| Destination          | Official capability observed                                                                                                      | SellFuse MVP mode      | Notes                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| eBay                 | Sell Inventory API can create inventory items/offers, publish, update, retrieve, withdraw, and delete with OAuth and seller setup | `DIRECT_API` / planned | Adapter contract only; no credentials or authorized sandbox test yet                |
| Pinterest            | API v5 can create, read, update, and delete Pins with approved access and OAuth scopes                                            | `DIRECT_API` / planned | Creates Pins, not a general marketplace checkout listing; no credentials configured |
| Facebook Marketplace | No generally available consumer Marketplace listing-publish integration was verified in public official docs                      | `ASSISTED`             | Copy-ready draft and user completes submission                                      |
| Instagram            | Content publishing is not treated as used-goods Marketplace listing publication                                                   | `ASSISTED`             | Social post preparation only; never presented as marketplace automation             |
| OfferUp              | No authorized public listing API verified                                                                                         | `ASSISTED`             | No credential collection or browser automation                                      |
| Mercari              | No authorized public listing API verified                                                                                         | `ASSISTED`             | User completes listing in Mercari                                                   |
| Poshmark             | No authorized public listing API verified                                                                                         | `ASSISTED`             | User completes listing in Poshmark                                                  |
| Depop                | No authorized public listing API verified                                                                                         | `ASSISTED`             | User completes listing in Depop                                                     |
| Craigslist           | No authorized public listing API verified                                                                                         | `ASSISTED`             | User completes listing on Craigslist                                                |

Capability and implementation status are separate fields. UI must show “API integration planned,” “Assisted,” or “Unavailable,” never “Connected” or “Direct publishing” unless a real authorized connection exists.

Official references used: eBay Selling Integration Guide and Inventory API documentation; Pinterest API v5 board/Pin and sandbox documentation. Re-check terms and app-review requirements before enabling any production adapter.
