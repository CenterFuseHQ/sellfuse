import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { AuthService } from "./auth.js";
import { createApiHttpServer } from "./http-server.js";
import type { SellFuseApiService } from "./service.js";

const TEST_SECRET = "sellfuse-http-test-secret-that-is-at-least-32-characters";
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

async function startApi(
  options: { authenticationBodyLimit?: number; service?: Pick<SellFuseApiService, "handle"> } = {},
): Promise<{ baseUrl: string; auth: AuthService }> {
  const auth = new AuthService(TEST_SECRET);
  const service =
    options.service ??
    ({
      handle: async () => ({ status: 200, body: { ok: true } }),
    } satisfies Pick<SellFuseApiService, "handle">);
  const server = createApiHttpServer({
    auth,
    service,
    webOrigin: "http://localhost:3001",
    ...(options.authenticationBodyLimit === undefined
      ? {}
      : { bodyLimits: { authentication: options.authenticationBodyLimit } }),
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test API server did not bind to a TCP port");
  return { baseUrl: "http://127.0.0.1:" + address.port, auth };
}

describe("SellFuse API HTTP security", () => {
  it("rejects unauthenticated bodies before parsing them", async () => {
    const { baseUrl } = await startApi();
    const response = await fetch(baseUrl + "/v1/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("rejects oversized authentication bodies with HTTP 413", async () => {
    const { baseUrl } = await startApi({ authenticationBodyLimit: 8 });
    const response = await fetch(baseUrl + "/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "123456789",
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "REQUEST_TOO_LARGE" });
  });

  it("rate limits authenticated inference requests per user", async () => {
    const handle = vi.fn(async () => ({ status: 200, body: { ok: true } }));
    const { baseUrl, auth } = await startApi({ service: { handle } });
    const { accessToken } = await auth.register({
      email: "seller@example.com",
      password: "a-long-test-password-for-this-suite",
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(baseUrl + "/v1/intelligence/prepare", {
        method: "POST",
        headers: {
          authorization: "Bearer " + accessToken,
          "content-type": "application/json",
        },
        body: "{}",
      });
      expect(response.status).toBe(200);
    }

    const limited = await fetch(baseUrl + "/v1/intelligence/prepare", {
      method: "POST",
      headers: {
        authorization: "Bearer " + accessToken,
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "RATE_LIMITED" });
    expect(handle).toHaveBeenCalledTimes(5);
  });

  it("rate limits authentication attempts by client address", async () => {
    const { baseUrl } = await startApi();
    const body = JSON.stringify({
      email: "unknown@example.com",
      password: "a-long-test-password-for-this-suite",
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(baseUrl + "/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      expect(response.status).toBe(401);
    }

    const limited = await fetch(baseUrl + "/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    expect(limited.status).toBe(429);
  });
});
