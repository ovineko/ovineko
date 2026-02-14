import type { FastifyPluginAsync } from "fastify";

import fp from "fastify-plugin";
import http from "node:http";

import type { ServerOptions } from "../options";

import { getSafeOptions } from "../options.safe";

interface PortConfig {
  allowedPrefixes?: string[];
  deniedPrefixes?: string[];
  host: string;
  order: number;
  port: number;
}

export const setupPortIsolation = fp(
  (async (fastify, options) => {
    const serversMap = new Map<string, http.Server>();
    const safeOptions = getSafeOptions(options);

    fastify.decorate("listenWithIsolation", async () => {
      const { host, management, port } = safeOptions.listen;

      const portsConfig: Record<string, PortConfig> = {
        api: {
          deniedPrefixes: [management.prefix],
          host,
          order: 1,
          port,
        },
        management: {
          allowedPrefixes: [management.prefix],
          host,
          order: 2,
          port: management.port,
        },
      };

      // Sort by order for startup (ASC: 1 → 2)
      const startOrder = Object.entries(portsConfig).sort(([, a], [, b]) => a.order - b.order);

      for (const [name, config] of startOrder) {
        const server = http.createServer((req, res) => {
          const { allowedPrefixes = [], deniedPrefixes = [] } = config;

          const isAllowed =
            allowedPrefixes.length === 0 ||
            allowedPrefixes.some((prefix) => req.url?.startsWith(prefix));

          const isDenied = deniedPrefixes.some((prefix) => req.url?.startsWith(prefix));

          if (!isAllowed || isDenied) {
            res.writeHead(name === "management" ? 404 : 403, {
              "Content-Type": "application/json",
            });
            res.end(
              JSON.stringify({
                error: name === "management" ? "Not Found" : "Forbidden",
                message:
                  name === "management"
                    ? "This endpoint is not available on management port"
                    : "Management endpoints are not available on API port",
              }),
            );
            return;
          }

          fastify.routing(req, res);
        });

        server.on("upgrade", (req, socket, head) => {
          const { allowedPrefixes = [], deniedPrefixes = [] } = config;

          const isAllowed =
            allowedPrefixes.length === 0 ||
            allowedPrefixes.some((prefix) => req.url?.startsWith(prefix));

          const isDenied = deniedPrefixes.some((prefix) => req.url?.startsWith(prefix));

          if (!isAllowed || isDenied) {
            socket.write(
              "HTTP/1.1 403 Forbidden\r\n" +
                "Content-Type: application/json\r\n" +
                "Connection: close\r\n\r\n" +
                JSON.stringify({
                  error: name === "management" ? "Not Found" : "Forbidden",
                  message:
                    name === "management"
                      ? "WebSocket endpoint not available on management port"
                      : "Management WebSocket endpoints not available on API port",
                }),
            );
            socket.destroy();
            return;
          }

          (fastify as any).routing(req, socket, head);
        });

        serversMap.set(name, server);

        await new Promise<void>((resolve, reject) => {
          server.listen(config.port, config.host, (err?: Error) => {
            if (err) {
              reject(err);
            } else {
              fastify.log.info(`${name} server listening on ${config.host}:${config.port}`);
              resolve();
            }
          });
        });
      }
    });

    // Graceful shutdown
    fastify.addHook("onClose", async () => {
      if (serversMap.size > 0) {
        fastify.log.info("Closing multi-port servers...");

        const { host, management, port } = safeOptions.listen;
        const portsConfig: Record<string, PortConfig> = {
          api: {
            deniedPrefixes: [management.prefix],
            host,
            order: 1,
            port,
          },
          management: {
            allowedPrefixes: [management.prefix],
            host,
            order: 2,
            port: management.port,
          },
        };

        // Sort by order in reverse for shutdown (DESC: 2 → 1)
        const stopOrder = Object.entries(portsConfig).sort(([, a], [, b]) => b.order - a.order);

        for (const [name] of stopOrder) {
          const server = serversMap.get(name);
          if (server) {
            await new Promise<void>((resolve) => {
              server.close(() => {
                fastify.log.info(`${name} server closed`);
                resolve();
              });
            });
          }
        }

        fastify.log.info("All servers closed");
      }
    });
  }) satisfies FastifyPluginAsync<ServerOptions>,
  {
    name: "port-isolation",
  },
);
