import { createServer } from "node:http";
import { loadGatewayConfig } from "./config.js";
import { GatewayService } from "./service.js";

const config = loadGatewayConfig(process.env);
const service = new GatewayService(
  config.token,
  config.provider,
  config.maxConcurrency,
  Number(process.env.AI_MAX_IMAGE_BYTES ?? 8 * 1024 * 1024),
);
const maxBodyBytes = 70 * 1024 * 1024;

const server = createServer(async (request, response) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) {
      response
        .writeHead(413)
        .end(JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }));
      return;
    }
    chunks.push(buffer);
  }
  let body: unknown;
  try {
    body = chunks.length
      ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
      : undefined;
  } catch {
    response
      .writeHead(400, { "content-type": "application/json" })
      .end(JSON.stringify({ error: "INVALID_JSON" }));
    return;
  }
  const result = await service.handle({
    method: request.method ?? "GET",
    path: new URL(request.url ?? "/", "http://gateway.internal").pathname,
    ...(typeof request.headers.authorization === "string"
      ? { authorization: request.headers.authorization }
      : {}),
    ...(body === undefined ? {} : { body }),
  });
  response
    .writeHead(result.status, {
      "content-type": "application/json",
      "cache-control": "no-store",
    })
    .end(JSON.stringify(result.body));
});

server.listen(config.port, config.host, () =>
  process.stdout.write(
    `Nader AI Gateway listening on ${config.host}:${config.port}\n`,
  ),
);
