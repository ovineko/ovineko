import type { FastifyCompressOptions } from "@fastify/compress";
import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import type { Static, TSchema } from "@fastify/type-provider-typebox";
import type {
  ContextConfigDefault,
  FastifyBaseLogger,
  FastifyInstance as FastifyFastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  FastifyTypeProviderDefault,
  LogLevel,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
} from "fastify";

import type closeWithGrace from "close-with-grace";
import type { Options as CloseWithGraceOptions } from "close-with-grace";
import type { FastifyTypeProvider, ResolveFastifyRequestType } from "fastify/types/type-provider";
import type { OpenAPIV3_1 } from "openapi-types";

export interface CreateServerOptions {
  hooks?: {
    onListen?: (args: { logger: FastifyBaseLogger }) => Promise<void>;
    onReady?: () => Promise<void>;
  };
  listen?: CreateServerOptionsListen;
  logger?: CreateServerOptionsLogger;
  plugins?: {
    compress?: FastifyCompressOptions;
    swagger?: CreateServerOptionsSwagger;
  };
}

export interface CreateServerOptionsListen {
  disableEchoHandler?: boolean;
  grace?: Omit<CloseWithGraceOptions, "logger">;
  host?: string;
  managementPort?: number;
  port?: number;
  printRoutes?: boolean;
}

export interface CreateServerOptionsLogger {
  /** @default info */
  level?: LogLevel;
  /** @default json */
  mode?: "human" | "json";
}

export interface CreateServerOptionsSwagger {
  enabled?: boolean;
  openapi?: Partial<OpenAPIV3_1.Document>;
  /** @def */
  prefix?: string;
  ui?: FastifySwaggerUiOptions;
}

export type FastifyHeaders = RawRequestDefaultExpression["headers"] &
  ResolveFastifyRequestType<
    FastifyTypeProviderDefault,
    FastifySchema,
    RouteGenericInterface
  >["headers"];

export type FastifyInstance = FastifyFastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  Logger,
  TypeBoxTypeProvider
>;

export type FastifyReplyTypeBox<TSchema extends FastifySchema> = FastifyReply<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  ContextConfigDefault,
  TSchema,
  TypeBoxTypeProvider
>;

export type FastifyRequestTypebox<TSchema extends RouteSchema> = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  TSchema,
  TypeBoxTypeProvider
>;

export type Logger = FastifyBaseLogger;

export interface RouteSchema<
  Body = unknown,
  Response = unknown,
  Querystring = unknown,
  Params = unknown,
  Headers = unknown,
> {
  body?: Body;
  headers?: Headers;
  params?: Params;
  querystring?: Querystring;
  response?: Response;
}

export interface ServerInstance {
  fastify: FastifyInstance;
  getSwaggerJSON: () => Promise<any>;
  listen: () => Promise<ReturnType<typeof closeWithGrace>>;
  logger: FastifyBaseLogger;
}

export interface TypeBoxTypeProvider extends FastifyTypeProvider {
  serializer: FastifyTypeProvider["schema"] extends TSchema
    ? Static<FastifyTypeProvider["schema"]>
    : unknown;
  validator: FastifyTypeProvider["schema"] extends TSchema
    ? Static<FastifyTypeProvider["schema"]>
    : unknown;
}
