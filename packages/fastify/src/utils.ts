import type { LogLevel } from "fastify";

import type { CreateServerOptions } from "./types";

export interface CreateServerOptionsListen {
  listen: {
    /** @default :: */
    host: string;
    managementPort: number;
    port: number;
  };
  logger: {
    level: LogLevel;
  };
  plugins: {
    swagger: {
      prefix: string;
    };
  };
}

export const getServerOptionsSafe = (options: CreateServerOptions): CreateServerOptionsListen => {
  return {
    listen: {
      host: options.listen?.host ?? "::",
      managementPort: options.listen?.managementPort ?? 8081,
      port: options.listen?.port ?? 8080,
    },
    logger: {
      level: options?.logger?.level ?? "info",
    },
    plugins: {
      swagger: {
        prefix: options.plugins?.swagger?.prefix ?? "/swagger",
      },
    },
  };
};
