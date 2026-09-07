# Market evidence boundary

AI inference and market-data retrieval are separate dependencies.

`MarketDataSource.search()` accepts an identification query and returns untrusted candidate records. `AllowedMarketDataRetriever` calls only configured source IDs, validates every record, removes duplicate IDs, and rejects `AI_ESTIMATE_ONLY` records from data providers. Production connectors must document the source's permission, license, rate limits, retention requirements, and stable record-link behavior before being allow-listed.

Evidence types:

- `SOLD_COMPARABLE`: a verifiable completed transaction from an allowed source.
- `ACTIVE_LISTING`: an asking price; it does not prove a sale.
- `RETAIL_REFERENCE`: a new-retail or catalog reference, not resale evidence.
- `USER_INPUT`: a seller-supplied fact or price.
- `AI_ESTIMATE_ONLY`: a disclosure marker used when identification exists but market evidence does not. It never carries an invented comparable price.

The valuation service computes price outputs from validated evidence. The model can explain relevance and select existing evidence IDs; it cannot originate evidence or price values. Mixed currencies fail closed until a verified conversion is supplied.
