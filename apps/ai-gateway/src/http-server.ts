import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import {
  HTTP_BODY_LIMITS,
  InvalidJsonBodyError,
  FixedWindowRateLimiter,
  RATE_LIMIT_BUCKETS,
  readJsonBody,
  RequestBodyTooLargeError,
} from "@sellfuse/http-security";
import type { GatewayService } from "./service.js";

export interface GatewayHttpBodyLimits {
  standard: number;
  analysis: number;
}

export function createGatewayHttpServer(
  service: GatewayService,
  bodyLimits: Partial<GatewayHttpBodyLimits> = {},
): Server {
  const limits = {
    standard: HTTP_BODY_LIMITS.standard,
    analysis: HTTP_BODY_LIMITS.analysis,
    ...bodyLimits,
  };
  const inferenceAttempts = new FixedWindowRateLimiter(
    RATE_LIMIT_BUCKETS.analysis.attempts,
    RATE_LIMIT_BUCKETS.analysis.windowMs,
  );
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(
        request.url ?? "/",
        "http://gateway.internal",
      ).pathname;
      const authorization = getAuthorizationHeader(request);
      if (!service.isAuthenticated(authorization)) {
        request.resume();
        sendJson(response, 401, { error: "UNAUTHORIZED" });
        return;
      }

      const isInference = request.method === "POST" && path === "/v1/inference";
      if (
        isInference &&
        !inferenceAttempts.allow(request.socket.remoteAddress ?? "unknown")
      ) {
        request.resume();
        sendJson(response, 429, { error: "RATE_LIMITED" });
        return;
      }

      let body: unknown;
      if (request.method === "POST") {
        body = await readJsonBody(
          request,
          isInference ? limits.analysis : limits.standard,
        );
      } else {
        request.resume();
      }

      const result = await service.handle({
        method: request.method ?? "GET",
        path,
        ...(authorization === undefined ? {} : { authorization }),
        ...(body === undefined ? {} : { body }),
      });
      sendJson(response, result.status, result.body);
    } catch (error) {
      if (response.destroyed || response.writableEnded) return;
      if (error instanceof RequestBodyTooLargeError) {
        sendJson(response, 413, { error: "PAYLOAD_TOO_LARGE" });
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
}

function getAuthorizationHeader(request: IncomingMessage): string | undefined {
  const header = request.headers.authorization;
  return Array.isArray(header) ? header[0] : header;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  if (response.destroyed || response.writableEnded) return;
  response
    .writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    })
    .end(JSON.stringify(body));
}
