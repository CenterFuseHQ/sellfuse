import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createSellFuseWebServer } from "./http-server.js";
import sellFuseVercelHandler from "./server.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

async function startServer(html: string): Promise<string> {
  const server = createSellFuseWebServer(html);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port");
  return `http://127.0.0.1:${address.port}`;
}

describe("SellFuse web health contract", () => {
  it("exports the HTTP handler used by Vercel Functions", async () => {
    const server = createServer(sellFuseVercelHandler);
    servers.push(server);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port");

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", service: "sellfuse-web" });
  });

  it("exposes only its service identity at the public liveness route", async () => {
    const baseUrl = await startServer("<main>SellFuse</main>");

    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", service: "sellfuse-web" });
  });

  it("continues serving the web app and rejects non-read methods", async () => {
    const baseUrl = await startServer("<main>SellFuse</main>");

    const page = await fetch(`${baseUrl}/`);
    const write = await fetch(`${baseUrl}/health`, { method: "POST" });

    expect(page.status).toBe(200);
    expect(await page.text()).toBe("<main>SellFuse</main>");
    expect(write.status).toBe(405);
  });
});
