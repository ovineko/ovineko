import type { FastifyPluginAsync } from "fastify";

import fp from "fastify-plugin";
import http from "node:http";

import type { CreateServerOptions } from "../types";

import { getServerOptionsSafe } from "../utils";

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
    const safeOptions = getServerOptionsSafe(options);

    // Добавляем метод listenWithIsolation через декоратор
    fastify.decorate("listenWithIsolation", async () => {
      const { host, managementPort, port } = safeOptions.listen;

      const portsConfig: Record<string, PortConfig> = {
        api: {
          deniedPrefixes: ["/management"],
          host,
          order: 1,
          port,
        },
        management: {
          allowedPrefixes: ["/management"],
          host,
          order: 2,
          port: managementPort,
        },
      };

      // Сортируем по order для запуска (ASC: 1 → 2)
      const startOrder = Object.entries(portsConfig).sort(([, a], [, b]) => a.order - b.order);

      // Создаём сервер для каждого порта в правильном порядке
      for (const [name, config] of startOrder) {
        const server = http.createServer((req, res) => {
          const { allowedPrefixes = [], deniedPrefixes = [] } = config;

          // Проверяем разрешённые префиксы
          const isAllowed =
            allowedPrefixes.length === 0 ||
            allowedPrefixes.some((prefix) => req.url?.startsWith(prefix));

          // Проверяем запрещённые префиксы
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

          // Передаём запрос в Fastify
          fastify.routing(req, res);
        });

        // Обработка WebSocket upgrade события
        server.on("upgrade", (req, socket, head) => {
          const { allowedPrefixes = [], deniedPrefixes = [] } = config;

          // Проверяем разрешённые префиксы
          const isAllowed =
            allowedPrefixes.length === 0 ||
            allowedPrefixes.some((prefix) => req.url?.startsWith(prefix));

          // Проверяем запрещённые префиксы
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

          // Передаём WebSocket upgrade в Fastify
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

        // Получаем конфиг для сортировки
        const { host, managementPort, port } = safeOptions.listen;
        const portsConfig: Record<string, PortConfig> = {
          api: {
            deniedPrefixes: ["/management"],
            host,
            order: 1,
            port,
          },
          management: {
            allowedPrefixes: ["/management"],
            host,
            order: 2,
            port: managementPort,
          },
        };

        // Сортируем по order в обратном порядке для остановки (DESC: 2 → 1)
        const stopOrder = Object.entries(portsConfig).sort(([, a], [, b]) => b.order - a.order);

        // Закрываем серверы последовательно в обратном порядке
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
  }) satisfies FastifyPluginAsync<CreateServerOptions>,
  {
    name: "port-isolation",
  },
);
