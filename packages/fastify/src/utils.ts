import type { LogLevel } from "fastify";

import type { CreateServerOptions } from "./types";

export interface CreateServerOptionsListen {
  listen: {
    /** @default :: */
    host: string;
    port: number;
  };
  logger: {
    level: LogLevel;
  };
}

export const getServerOptionsSafe = (options: CreateServerOptions): CreateServerOptionsListen => {
  return {
    listen: {
      host: options.listen?.host ?? "::",
      port: options.listen?.port ?? 8080,
    },
    logger: {
      level: options?.logger?.level ?? "info",
    },
  };
};
