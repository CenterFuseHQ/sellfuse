import { createServer, type Server } from "node:http";

export function createSellFuseWebServer(html: string): Server {
  return createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://sellfuse.local").pathname;
    if (request.method === "GET" && pathname === "/health") {
      response
        .writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
        })
        .end(JSON.stringify({ status: "ok", service: "sellfuse-web" }));
      return;
    }

    if (request.method !== "GET") {
      response
        .writeHead(405, {
          allow: "GET",
          "content-type": "text/plain; charset=utf-8",
          "x-content-type-options": "nosniff",
        })
        .end("Method not allowed");
      return;
    }

    response
      .writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "x-content-type-options": "nosniff",
        "referrer-policy": "same-origin",
      })
      .end(html);
  });
}
