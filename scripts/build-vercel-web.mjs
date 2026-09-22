import { mkdir, writeFile } from "node:fs/promises";
import { renderAppPage } from "../apps/web/dist/app-page.js";
import { resolveProductUrls } from "../packages/config/dist/index.js";

const apiUrl = process.env.SELLFUSE_API_URL?.trim() ?? "";
const hostedEnvironment = {
  ...process.env,
  VERCEL: "1",
  VERCEL_ENV: "production",
  CENTERFUSE_URL: process.env.CENTERFUSE_URL || "https://centerfuse.vercel.app",
  SELLFUSE_URL: process.env.SELLFUSE_URL || "https://sellfuse.vercel.app",
  BUYFUSE_URL: process.env.BUYFUSE_URL || "https://buyfuse.vercel.app",
};
const html = renderAppPage(apiUrl, resolveProductUrls(hostedEnvironment));

await mkdir("dist-web", { recursive: true });
await writeFile("dist-web/index.html", html, "utf8");
process.stdout.write(
  `SellFuse Vercel web build written (apiConfigured=${String(Boolean(apiUrl))})\n`,
);
