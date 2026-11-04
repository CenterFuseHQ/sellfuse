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
        response.writeHead(204, responseHeaders).end(() => request.destroy());
        return;
      }
      if (request.method === "GET" && path === "/health") {
        sendJson(
          response,
          200,
          { status: "ok", service: "sellfuse-api" },
          hasRequestBody(request) ? () => request.destroy() : undefined,
        );
        return;
      }

      const isRegister =
        request.method === "POST" && path === "/v1/auth/register";
      const isLogin = request.method === "POST" && path === "/v1/auth/login";
      if (isRegister || isLogin) {
        const client = request.socket.remoteAddress ?? "unknown";
        if (!authAttempts.allow(client)) {
          sendJson(response, 429, { error: "RATE_LIMITED" }, () => request.destroy());
          return;
        }

        if (declaredBodyExceeds(request, bodyLimits.authentication)) {
          sendJson(response, 413, { error: "REQUEST_TOO_LARGE" }, () => request.destroy());
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
        sendJson(
          response,
          401,
          { error: "UNAUTHORIZED" },
          hasRequestBody(request) ? () => request.destroy() : undefined,
        );
        return;
      }

      const requiredPermission: Permission =
        request.method === "POST" && /\/(publish|sold)$/.test(path)
          ? "SELLFUSE_LISTING_PUBLISH"
          : request.method === "POST"
            ? "SELLFUSE_LISTING_WRITE"
            : "SELLFUSE_LISTING_READ";
      if (!hasPermission(context, requiredPermission)) {
        sendJson(
          response,
          403,
          { error: "FORBIDDEN" },
          hasRequestBody(request) ? () => request.destroy() : undefined,
        );
        return;
      }

      if (request.method !== "POST" && hasRequestBody(request)) {
        sendJson(response, 400, { error: "UNEXPECTED_REQUEST_BODY" }, () => request.destroy());
        return;
      }

      const isAnalysis =
        request.method === "POST" && path === "/v1/intelligence/prepare";
      if (isAnalysis && !analysisAttempts.allow(context.userId)) {
        sendJson(response, 429, { error: "RATE_LIMITED" }, () => request.destroy());
        return;
      }

      const bodyLimit = isAnalysis ? bodyLimits.analysis : bodyLimits.standard;
      if (request.method === "POST" && declaredBodyExceeds(request, bodyLimit)) {
        sendJson(response, 413, { error: "REQUEST_TOO_LARGE" }, () => request.destroy());
        return;
      }
      const body =
        request.method === "POST"
          ? await readJsonBody(request, bodyLimit)
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
        sendJson(response, 413, { error: "REQUEST_TOO_LARGE" }, () => request.destroy());
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
    afterSend?: () => void,
  ): void {
    if (response.destroyed || response.writableEnded) return;
    response
      .writeHead(status, {
        ...responseHeaders,
        "content-type": "application/json; charset=utf-8",
      })
      .end(JSON.stringify(body), afterSend);
  }
}

function hasRequestBody(request: IncomingMessage): boolean {
  return (request.headers["content-length"] ?? "0") !== "0" ||
    request.headers["transfer-encoding"] !== undefined;
}

function declaredBodyExceeds(request: IncomingMessage, maximumBytes: number): boolean {
  const contentLength = request.headers["content-length"];
  return contentLength !== undefined && Number(contentLength) > maximumBytes;
}

function getAuthorizationHeader(request: IncomingMessage): string | undefined {
  const header = request.headers.authorization;
  return Array.isArray(header) ? header[0] : header;
}
