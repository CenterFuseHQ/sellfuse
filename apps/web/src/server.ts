import { createServer } from "node:http";
import { renderAppPage } from "./app-page.js";

const html = renderAppPage(
  process.env.SELLFUSE_API_URL ?? "http://localhost:4000",
);
createServer((_request, response) =>
  response
    .writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
    })
    .end(html),
).listen(Number(process.env.PORT ?? 3000), "127.0.0.1");
