import type { FastifyCompressOptions } from "@fastify/compress";
import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import type { FastifyBaseLogger, LogLevel } from "fastify";

import type { Options as CloseWithGraceOptions } from "close-with-grace";
import type { OpenAPIV3_1 } from "openapi-types";

export interface ServerOptions {
  hooks?: {
    onListen?: (args: { logger: FastifyBaseLogger }) => Promise<void>;
    onReady?: () => Promise<void>;
  };
  listen?: ServerOptionsListen;
  logger?: ServerOptionsLogger;
  plugins?: {
    compress?: FastifyCompressOptions;
    swagger?: ServerOptionsSwagger;
  };
}

export interface ServerOptionsListen {
  disableEchoHandler?: boolean;
  grace?: Omit<CloseWithGraceOptions, "logger">;
  host?: string;
  management?: {
    disable?: boolean;
    port?: number;
    prefix?: string;
  };
  port?: number;
  printRoutes?: boolean;
}

export interface ServerOptionsLogger {
  /** @default info */
  level?: LogLevel;
  /** @default json */
  mode?: "human" | "json";
}

export interface ServerOptionsSwagger {
  enabled?: boolean;
  openapi?: Partial<OpenAPIV3_1.Document>;
  /** @def */
  prefix?: string;
  ui?: FastifySwaggerUiOptions;
}
