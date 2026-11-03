import { afterEach, describe, expect, it } from "vitest";
import { request as httpRequest } from "node:http";
import { GatewayService } from "./service.js";
import { createGatewayHttpServer } from "./http-server.js";
import type { SelfHostedModelProvider } from "@sellfuse/ai-gateway";
import type { Server } from "node:http";

const TOKEN = "test-gateway-token-with-at-least-32-characters";
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

async function startGateway(
  bodyLimits?: { standard: number; analysis?: number },
): Promise<string> {
  const provider = {
    embed: async () => ({ vector: [] }),
    health: async () => true,
    infer: async () => ({ content: "" }),
  } as unknown as SelfHostedModelProvider;
  const service = new GatewayService(TOKEN, provider);
  const server = createGatewayHttpServer(service, bodyLimits);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test gateway did not bind to a TCP port");
  return "http://127.0.0.1:" + address.port;
}

describe("AI Gateway HTTP security", () => {
  it("rejects unauthenticated bodies before parsing them", async () => {
    const baseUrl = await startGateway();
    const response = await fetch(baseUrl + "/v1/inference", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("returns a bounded error for oversized authenticated requests", async () => {
    const baseUrl = await startGateway({ standard: 8 });
    const response = await fetch(baseUrl + "/v1/embeddings", {
      method: "POST",
      headers: {
        authorization: "Bearer " + TOKEN,
        "content-type": "application/json",
      },
      body: "123456789",
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "PAYLOAD_TOO_LARGE" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns 413 for a chunked oversized body before the sender finishes", async () => {
    const baseUrl = await startGateway({ standard: 8 });
    const target = new URL(baseUrl);
    const responsePromise = new Promise<{ status: number; body: string }>((resolve, reject) => {
      const request = httpRequest({
        hostname: target.hostname,
        port: target.port,
        path: "/v1/embeddings",
        method: "POST",
        headers: {
          authorization: "Bearer " + TOKEN,
          "transfer-encoding": "chunked",
        },
      });
      let responseStarted = false;
      request.once("error", (error) => {
        if (!responseStarted) reject(error);
      });
      request.once("response", (response) => {
        responseStarted = true;
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => (body += chunk));
        response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
      });
      request.setTimeout(2_000, () => reject(new Error("server waited for the request body to finish")));
      request.write("123456789");
    });

    const response = await responsePromise;
    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toEqual({ error: "PAYLOAD_TOO_LARGE" });
  });

  it("reports malformed JSON without reflecting request contents", async () => {
    const baseUrl = await startGateway();
    const response = await fetch(baseUrl + "/v1/inference", {
      method: "POST",
      headers: {
        authorization: "Bearer " + TOKEN,
        "content-type": "application/json",
      },
      body: "{private-input",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_JSON" });
  });

  it("rate limits direct authenticated inference before parsing request bodies", async () => {
    const baseUrl = await startGateway();
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const response = await fetch(baseUrl + "/v1/inference", {
        method: "POST",
        headers: {
          authorization: "Bearer " + TOKEN,
          "content-type": "application/json",
        },
        body: "{}",
      });
      expect(response.status).not.toBe(429);
    }

    const limited = await fetch(baseUrl + "/v1/inference", {
      method: "POST",
      headers: {
        authorization: "Bearer " + TOKEN,
        "content-type": "application/json",
      },
      body: "{",
    });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "RATE_LIMITED" });
  });
});
