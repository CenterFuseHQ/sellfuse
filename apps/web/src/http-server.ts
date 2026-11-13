import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export function createSellFuseWebHandler(html: string) {
  return (request: IncomingMessage, response: ServerResponse) => {
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
  };
}

export function createSellFuseWebServer(html: string): Server {
  return createServer(createSellFuseWebHandler(html));
}
