import { createServer } from "node:http";
import { HttpAiGatewayClient } from "@sellfuse/ai-gateway";
import {
  AllowedMarketDataRetriever,
  NoMarketDataSource,
  SellFuseIntelligenceService,
} from "@sellfuse/domain";
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
const marketData = new AllowedMarketDataRetriever(
  [new NoMarketDataSource()],
  [],
);
const service = new SellFuseApiService(
  new SellFuseIntelligenceService(gateway, marketData),
);
const maxBodyBytes = 70 * 1024 * 1024;

createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) {
      response.writeHead(413).end();
      return;
    }
    chunks.push(buffer);
  }
  let body: unknown;
  try {
    body = chunks.length
      ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
      : undefined;
  } catch {
    response
      .writeHead(400, { "content-type": "application/json" })
      .end(JSON.stringify({ error: "INVALID_JSON" }));
    return;
  }
  const userId =
    typeof request.headers["x-sellfuse-user-id"] === "string"
      ? request.headers["x-sellfuse-user-id"]
      : "development-user";
  const result = await service.handle({
    method: request.method ?? "GET",
    path: new URL(request.url ?? "/", "http://api.internal").pathname,
    userId,
    ...(body === undefined ? {} : { body }),
  });
  response
    .writeHead(result.status, {
      "content-type": "application/json",
      "cache-control": "no-store",
      "access-control-allow-origin":
        process.env.WEB_ORIGIN ?? "http://localhost:3000",
    })
    .end(JSON.stringify(result.body));
}).listen(Number(process.env.API_PORT ?? 4000), "127.0.0.1", () =>
  process.stdout.write("SellFuse API listening on 127.0.0.1\n"),
);
