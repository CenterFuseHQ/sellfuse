import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { InMemoryIdentityService, buyFuseEntitlement } from "@centerfuse/auth";
import { BuyerWorkspaceService } from "@centerfuse/buyfuse-domain";
import { PRODUCTS, resolveProductUrls } from "@centerfuse/config";
import { renderBuyFuseDashboard, renderBuyFuseState } from "./page.js";

const urls = resolveProductUrls(process.env); const port = Number(process.env.PORT ?? PRODUCTS.BUYFUSE.defaultPort);
const secret = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "buyfuse-local-development-secret-32chars");
if (secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
const identity = new InMemoryIdentityService({ secret, issuer: "centerfuse", audience: "buyfuse", defaultEntitlements: [buyFuseEntitlement] });
const workspace = new BuyerWorkspaceService(); const attempts = new Map<string, { count: number; resetAt: number }>();

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", urls.BUYFUSE);
    if (request.method === "GET" && url.pathname === "/manifest.webmanifest") return send(response, 200, { name: "BuyFuse", short_name: "BuyFuse", display: "standalone", theme_color: PRODUCTS.BUYFUSE.themeColor, background_color: "#f6f4ee", start_url: "/" }, "application/manifest+json");
    if (request.method === "GET" && url.pathname === "/") return send(response, 200, renderBuyFuseDashboard(urls), "text/html; charset=utf-8");
    if (request.method === "GET" && url.pathname === "/loading") return send(response, 200, renderBuyFuseState("loading", urls), "text/html; charset=utf-8");
    if (request.method === "POST" && ["/api/auth/register", "/api/auth/login"].includes(url.pathname)) {
      if (!allow(request.socket.remoteAddress ?? "unknown")) return send(response, 429, { error: "RATE_LIMITED" });
      const result = url.pathname.endsWith("register") ? await identity.register(await body(request)) : await identity.login(await body(request)); return send(response, 200, result);
    }
    const context = identity.context(request.headers.authorization);
    if (url.pathname.startsWith("/api/") && !context) return send(response, 401, { error: "UNAUTHORIZED" });
    if (request.method === "GET" && url.pathname === "/api/workspace") return send(response, 200, workspace.get(context!));
    if (request.method === "POST" && url.pathname === "/api/items") return send(response, 201, await workspace.save(context!, await body(request)));
    const match = /^\/api\/items\/([0-9a-f-]+)\/status$/.exec(url.pathname);
    if (request.method === "PATCH" && match) { const input = await body(request) as { status?: unknown }; return send(response, 200, workspace.updateStatus(context!, match[1]!, input.status)); }
    if (url.pathname.startsWith("/api/")) return send(response, 404, { error: "NOT_FOUND" });
    return send(response, 404, renderBuyFuseState("not-found", urls), "text/html; charset=utf-8");
  } catch (error) { const known = error instanceof Error && ["ACCOUNT_ALREADY_EXISTS", "INVALID_CREDENTIALS", "FORBIDDEN", "SAVED_ITEM_NOT_FOUND"].includes(error.message); return send(response, known ? 400 : 422, { error: known && error instanceof Error ? error.message : "INVALID_REQUEST" }); }
}).listen(port, "127.0.0.1", () => console.info(JSON.stringify({ event: "app.started", product: "BUYFUSE", port })));

async function body(request: IncomingMessage): Promise<unknown> { const chunks: Buffer[] = []; let size = 0; for await (const chunk of request) { const value = Buffer.from(chunk); size += value.length; if (size > 32_768) throw new Error("REQUEST_TOO_LARGE"); chunks.push(value); } return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
function allow(key: string): boolean { const now = Date.now(); const current = attempts.get(key); if (!current || current.resetAt < now) { attempts.set(key, { count: 1, resetAt: now + 60_000 }); return true; } current.count += 1; return current.count <= 10; }
function send(response: ServerResponse, status: number, data: unknown, type = "application/json; charset=utf-8") { const value = typeof data === "string" ? data : JSON.stringify(data); response.writeHead(status, { "content-type": type, "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'", "cache-control": type.startsWith("text/html") ? "no-store" : "private, no-store", "referrer-policy": "same-origin", "x-content-type-options": "nosniff", "x-frame-options": "DENY" }).end(value); }
