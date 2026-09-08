import { createServer } from "node:http";
import { PRODUCTS, resolveProductUrls } from "@centerfuse/config";
import { renderCenterFuseHome, renderCenterFuseState } from "./page.js";
const urls = resolveProductUrls(process.env); const port = Number(process.env.PORT ?? PRODUCTS.CENTERFUSE.defaultPort);
createServer((request, response) => {
  try {
    const pathname = new URL(request.url ?? "/", urls.CENTERFUSE).pathname;
    if (pathname === "/manifest.webmanifest") return send(response, 200, JSON.stringify({ name: "CenterFuse", short_name: "CenterFuse", display: "standalone", theme_color: PRODUCTS.CENTERFUSE.themeColor, background_color: "#f6f4ee", start_url: "/" }), "application/manifest+json");
    if (pathname === "/") return send(response, 200, renderCenterFuseHome(urls));
    if (pathname === "/loading") return send(response, 200, renderCenterFuseState("loading", urls));
    return send(response, 404, renderCenterFuseState("not-found", urls));
  } catch { return send(response, 500, renderCenterFuseState("error", urls)); }
}).listen(port, "127.0.0.1", () => console.info(JSON.stringify({ event: "app.started", product: "CENTERFUSE", port })));
function send(response: import("node:http").ServerResponse, status: number, body: string, type = "text/html; charset=utf-8") { response.writeHead(status, { "content-type": type, "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'", "referrer-policy": "strict-origin-when-cross-origin", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "permissions-policy": "camera=(), microphone=(), geolocation=()" }).end(body); }
