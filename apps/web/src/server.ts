import { renderAppPage } from "./app-page.js";
import { PRODUCTS, resolveProductUrls } from "@centerfuse/config";
import { createSellFuseWebServer } from "./http-server.js";

const urls = resolveProductUrls(process.env);
const html = renderAppPage(
  process.env.SELLFUSE_API_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000"),
  urls,
);

createSellFuseWebServer(html).listen(
  Number(process.env.PORT ?? PRODUCTS.SELLFUSE.defaultPort),
  process.env.HOST ?? "127.0.0.1",
);
