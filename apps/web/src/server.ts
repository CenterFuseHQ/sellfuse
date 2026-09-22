import { createServer } from "node:http";
import { renderAppPage } from "./app-page.js";
import { PRODUCTS, resolveProductUrls } from "@centerfuse/config";

const urls = resolveProductUrls(process.env);
const html = renderAppPage(
  process.env.SELLFUSE_API_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000"),
  urls,
);
createServer((_request, response) =>
  response
    .writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
    })
    .end(html),
).listen(Number(process.env.PORT ?? PRODUCTS.SELLFUSE.defaultPort), process.env.HOST ?? "127.0.0.1");
