import { createServer } from "node:http";
import { hasPermission } from "@centerfuse/auth";
import { HttpAiGatewayClient } from "@centerfuse/ai";
import {
  AllowedMarketDataRetriever,
  HttpMarketDataSource,
  NoMarketDataSource,
  SellFuseIntelligenceService,
} from "@sellfuse/domain";
import { AuthService } from "./auth.js";
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
const maxBodyBytes = 70 * 1024 * 1024;
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3001";
const responseHeaders = {
  "content-type": "application/json",
  "cache-control": "no-store",
  "access-control-allow-origin": webOrigin,
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  vary: "Origin",
};
const authAttempts = new Map<string, { count: number; resetAt: number }>();

createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, responseHeaders).end();
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) {
      response.writeHead(413, responseHeaders).end();
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
      .writeHead(400, responseHeaders)
      .end(JSON.stringify({ error: "INVALID_JSON" }));
    return;
  }
  const path = new URL(request.url ?? "/", "http://api.internal").pathname;
  if (
    request.method === "POST" &&
    (path === "/v1/auth/register" || path === "/v1/auth/login")
  ) {
    const client = request.socket.remoteAddress ?? "unknown";
    if (!allowAuthAttempt(client)) {
      response
        .writeHead(429, responseHeaders)
        .end(JSON.stringify({ error: "RATE_LIMITED" }));
      return;
    }
    try {
      const result =
        path === "/v1/auth/register"
          ? await auth.register(body)
          : await auth.login(body);
      response
        .writeHead(path.endsWith("register") ? 201 : 200, responseHeaders)
        .end(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "INVALID_REQUEST";
      const status =
        message === "ACCOUNT_ALREADY_EXISTS"
          ? 409
          : message === "INVALID_CREDENTIALS"
            ? 401
            : 400;
      response
        .writeHead(status, responseHeaders)
        .end(JSON.stringify({ error: message }));
    }
    return;
  }
  const authorization = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;
  const context = auth.context(authorization);
  if (!context) {
    response
      .writeHead(401, responseHeaders)
      .end(JSON.stringify({ error: "UNAUTHORIZED" }));
    return;
  }
  const requiredPermission =
    request.method === "POST" && /\/(publish|sold)$/.test(path)
      ? "SELLFUSE_LISTING_PUBLISH"
      : request.method === "POST"
        ? "SELLFUSE_LISTING_WRITE"
        : "SELLFUSE_LISTING_READ";
  if (!hasPermission(context, requiredPermission)) {
    response
      .writeHead(403, responseHeaders)
      .end(JSON.stringify({ error: "FORBIDDEN" }));
    return;
  }
  const result = await service.handle({
    method: request.method ?? "GET",
    path,
    userId: context.userId,
    ...(body === undefined ? {} : { body }),
  });
  response
    .writeHead(result.status, responseHeaders)
    .end(JSON.stringify(result.body));
}).listen(Number(process.env.API_PORT ?? 4000), "127.0.0.1", () =>
  process.stdout.write("SellFuse API listening on 127.0.0.1\n"),
);

function allowAuthAttempt(key: string): boolean {
  const now = Date.now();
  const current = authAttempts.get(key);
  if (!current || current.resetAt <= now) {
    authAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 10;
}
