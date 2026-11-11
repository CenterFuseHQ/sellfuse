import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAppPage } from "./app-page.js";
import { PRODUCTS, resolveProductUrls } from "@centerfuse/config";
import { createSellFuseWebHandler, createSellFuseWebServer } from "./http-server.js";

const urls = resolveProductUrls(process.env);
const html = renderAppPage(
  process.env.SELLFUSE_API_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000"),
  urls,
);

const vercelHandler = createSellFuseWebHandler(html);
export default vercelHandler;

if (
  process.env.VERCEL !== "1" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  createSellFuseWebServer(html).listen(
    Number(process.env.PORT ?? PRODUCTS.SELLFUSE.defaultPort),
    process.env.HOST ?? "127.0.0.1",
  );
}
