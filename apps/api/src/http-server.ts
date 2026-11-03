import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { hasPermission, type Permission } from "@centerfuse/auth";
import {
  FixedWindowRateLimiter,
  HTTP_BODY_LIMITS,
  InvalidJsonBodyError,
  RATE_LIMIT_BUCKETS,
  readJsonBody,
  RequestBodyTooLargeError,
} from "@sellfuse/http-security";
import type { AuthService } from "./auth.js";
import type { SellFuseApiService } from "./service.js";

export interface ApiHttpServerOptions {
  auth: Pick<AuthService, "context" | "login" | "register">;
  service: Pick<SellFuseApiService, "handle">;
  webOrigin: string;
  bodyLimits?: Partial<typeof HTTP_BODY_LIMITS>;
}

export function createApiHttpServer(options: ApiHttpServerOptions): Server {
  const bodyLimits = { ...HTTP_BODY_LIMITS, ...options.bodyLimits };
  const responseHeaders = {
    "cache-control": "no-store",
    "access-control-allow-origin": options.webOrigin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    vary: "Origin",
  };
  const authAttempts = new FixedWindowRateLimiter(
    RATE_LIMIT_BUCKETS.authentication.attempts,
    RATE_LIMIT_BUCKETS.authentication.windowMs,
  );
  const analysisAttempts = new FixedWindowRateLimiter(
    RATE_LIMIT_BUCKETS.analysis.attempts,
    RATE_LIMIT_BUCKETS.analysis.windowMs,
  );

  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url ?? "/", "http://api.internal").pathname;

      if (request.method === "OPTIONS") {
        request.resume();
        response.writeHead(204, responseHeaders).end();
        return;
      }
      if (request.method === "GET" && path === "/health") {
        request.resume();
        sendJson(response, 200, { status: "ok", service: "sellfuse-api" });
        return;
      }

      const isRegister =
        request.method === "POST" && path === "/v1/auth/register";
      const isLogin = request.method === "POST" && path === "/v1/auth/login";
      if (isRegister || isLogin) {
        const client = request.socket.remoteAddress ?? "unknown";
        if (!authAttempts.allow(client)) {
          request.resume();
          sendJson(response, 429, { error: "RATE_LIMITED" });
          return;
        }

        const body = await readJsonBody(request, bodyLimits.authentication);
        try {
          const result = isRegister
            ? await options.auth.register(body)
            : await options.auth.login(body);
          sendJson(response, isRegister ? 201 : 200, result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message === "ACCOUNT_ALREADY_EXISTS") {
            sendJson(response, 409, { error: message });
          } else if (message === "INVALID_CREDENTIALS") {
            sendJson(response, 401, { error: message });
          } else {
            sendJson(response, 400, { error: "INVALID_REQUEST" });
          }
        }
        return;
      }

      const authorization = getAuthorizationHeader(request);
      const context = options.auth.context(authorization);
      if (!context) {
        request.resume();
        sendJson(response, 401, { error: "UNAUTHORIZED" });
        return;
      }

      const requiredPermission: Permission =
        request.method === "POST" && /\/(publish|sold)$/.test(path)
          ? "SELLFUSE_LISTING_PUBLISH"
          : request.method === "POST"
            ? "SELLFUSE_LISTING_WRITE"
            : "SELLFUSE_LISTING_READ";
      if (!hasPermission(context, requiredPermission)) {
        request.resume();
        sendJson(response, 403, { error: "FORBIDDEN" });
        return;
      }

      const isAnalysis =
        request.method === "POST" && path === "/v1/intelligence/prepare";
      if (isAnalysis && !analysisAttempts.allow(context.userId)) {
        request.resume();
        sendJson(response, 429, { error: "RATE_LIMITED" });
        return;
      }

      const body =
        request.method === "POST"
          ? await readJsonBody(
              request,
              isAnalysis ? bodyLimits.analysis : bodyLimits.standard,
            )
          : undefined;
      const result = await options.service.handle({
        method: request.method ?? "GET",
        path,
        userId: context.userId,
        ...(body === undefined ? {} : { body }),
      });
      sendJson(response, result.status, result.body);
    } catch (error) {
      if (response.destroyed || response.writableEnded) return;
      if (error instanceof RequestBodyTooLargeError) {
        sendJson(response, 413, { error: "REQUEST_TOO_LARGE" });
      } else if (error instanceof InvalidJsonBodyError) {
        sendJson(response, 400, { error: "INVALID_JSON" });
      } else {
        sendJson(response, 500, { error: "INTERNAL_ERROR" });
      }
    }
  });

  server.requestTimeout = 120_000;
  server.headersTimeout = 60_000;
  return server;

  function sendJson(
    response: ServerResponse,
    status: number,
    body: unknown,
  ): void {
    if (response.destroyed || response.writableEnded) return;
    response
      .writeHead(status, {
        ...responseHeaders,
        "content-type": "application/json; charset=utf-8",
      })
      .end(JSON.stringify(body));
  }
}

function getAuthorizationHeader(request: IncomingMessage): string | undefined {
  const header = request.headers.authorization;
  return Array.isArray(header) ? header[0] : header;
}
