import type { LogLevel } from "fastify";

import type { ServerOptions } from "./options";

export interface SafeOptions {
  listen: {
    host: string;
    management: {
      port: number;
      prefix: string;
    };
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

export const getSafeOptions = (options: ServerOptions): SafeOptions => {
  return {
    listen: {
      host: options.listen?.host ?? "::",
      management: {
        port: options.listen?.management?.port ?? 8081,
        prefix: options.listen?.management?.prefix ?? "/management",
      },
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
