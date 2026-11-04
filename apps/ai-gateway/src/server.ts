import { loadGatewayConfig } from "./config.js";
import { createGatewayHttpServer } from "./http-server.js";
import { GatewayService } from "./service.js";

const config = loadGatewayConfig(process.env);
const service = new GatewayService(
  config.token,
  config.provider,
  config.maxConcurrency,
  Number(process.env.AI_MAX_IMAGE_BYTES ?? 8 * 1024 * 1024),
);
const server = createGatewayHttpServer(service);

server.listen(config.port, config.host, () =>
  process.stdout.write(
    "Nader AI Gateway listening on " + config.host + ":" + config.port + "\n",
  ),
);
