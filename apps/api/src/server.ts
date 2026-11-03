import { HttpAiGatewayClient } from "@centerfuse/ai";
import {
  AllowedMarketDataRetriever,
  HttpMarketDataSource,
  NoMarketDataSource,
  SellFuseIntelligenceService,
} from "@sellfuse/domain";
import { AuthService } from "./auth.js";
import { createApiHttpServer } from "./http-server.js";
import { SellFuseApiService } from "./service.js";

const gatewayUrl = process.env.AI_GATEWAY_BASE_URL?.trim();
const gatewayToken = process.env.AI_GATEWAY_TOKEN?.trim();
if (!gatewayUrl || !gatewayToken || gatewayToken.length < 32)
  throw new Error(
    "AI_GATEWAY_BASE_URL and a 32+ character AI_GATEWAY_TOKEN are required",
  );
const gateway = new HttpAiGatewayClient({
  baseUrl: gatewayUrl,
  token: gatewayToken,
  tenantId: "sellfuse",
  timeoutMs: 50_000,
});
const marketDataUrl = process.env.MARKET_DATA_BASE_URL?.trim();
const marketDataToken = process.env.MARKET_DATA_TOKEN?.trim();
const allowedMarketSources = (process.env.MARKET_DATA_ALLOWED_SOURCES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const hasAnyMarketConfig = Boolean(
  marketDataUrl || marketDataToken || allowedMarketSources.length,
);
if (
  hasAnyMarketConfig &&
  (!marketDataUrl || !marketDataToken || !allowedMarketSources.length)
)
  throw new Error(
    "MARKET_DATA_BASE_URL, MARKET_DATA_TOKEN, and MARKET_DATA_ALLOWED_SOURCES must be configured together",
  );
const marketSources = marketDataUrl
  ? allowedMarketSources.map(
      (id) =>
        new HttpMarketDataSource({
          id,
          baseUrl: marketDataUrl,
          token: marketDataToken!,
        }),
    )
  : [new NoMarketDataSource()];
const marketData = new AllowedMarketDataRetriever(
  marketSources,
  allowedMarketSources,
);
const service = new SellFuseApiService(
  new SellFuseIntelligenceService(gateway, marketData),
);
const auth = new AuthService(process.env.JWT_SECRET?.trim() ?? "");
const server = createApiHttpServer({
  auth,
  service,
  webOrigin: process.env.WEB_ORIGIN?.trim() || "http://localhost:3001",
});

server.listen(Number(process.env.API_PORT ?? 4000), process.env.HOST ?? "127.0.0.1", () =>
  process.stdout.write("SellFuse API listening on 127.0.0.1\n"),
);
