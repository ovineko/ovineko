import Fastify, { type FastifyInstance } from "fastify";

import closeWithGrace from "close-with-grace";

import type { CreateServerOptions, ServerInstance } from "./types";

import { setupCompress } from "./plugins/compress";
import { createLogger } from "./plugins/logger";
import { setupPortIsolation } from "./plugins/port-isolation";
import { getServerOptionsSafe } from "./utils";

export const createServer = async (options: CreateServerOptions): Promise<ServerInstance> => {
  const serverOptionsSafe = getServerOptionsSafe(options);

  const logger = createLogger(options);

  const fastify: FastifyInstance = Fastify({
    genReqId: (req) => {
      const xRequestId = req.headers?.["x-request-id"];

      return xRequestId ? String(xRequestId) : crypto.randomUUID();
    },
    loggerInstance: logger,
    requestIdLogLabel: "x_request_id",
  });

  await fastify.register(setupCompress, options);

  if (options.plugins?.swagger?.enabled) {
    const { setupSwagger } = await import("./plugins/swagger");
    await fastify.register(setupSwagger, options);
  }

  if (!options.listen?.disableEchoHandler) {
    const { echoHandler } = await import("./plugins/echoHandler");
    await fastify.register(echoHandler, options);
  }

  if (options.hooks) {
    if (typeof options.hooks.onReady === "function") {
      fastify.addHook("onReady", options.hooks.onReady);
    }

    if (typeof options.hooks.onListen === "function") {
      const onListen = options.hooks.onListen;
      fastify.addHook("onListen", () => onListen({ logger }));
    }
  }

  await fastify.register(setupPortIsolation, options);

  const listen = async (): Promise<ReturnType<typeof closeWithGrace>> => {
    logger.info(`Log level: ${serverOptionsSafe.logger.level}`);

    await fastify.ready();

    if (options.listen?.printRoutes) {
      console.debug(fastify.printRoutes());
    }

    // Явный вызов метода из плагина!
    await (serverOptionsSafe.listen.managementPort
      ? (fastify as any).listenWithIsolation()
      : fastify.listen({
          host: serverOptionsSafe.listen.host,
          port: serverOptionsSafe.listen.port,
        }));

    return closeWithGrace({ ...options.listen?.grace, logger }, async () => {
      fastify.log.info("closing");
      await fastify.close();
      fastify.log.info("closed");
    });
  };

  const getSwaggerJSON = async () => {
    console.log("getSwaggerJSON");

    await fastify.ready();
    return (fastify as any).swagger();
  };

  return { fastify, getSwaggerJSON, listen, logger };
};
