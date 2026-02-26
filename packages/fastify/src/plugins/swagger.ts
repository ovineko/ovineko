import fastifySwagger, { type SwaggerOptions } from "@fastify/swagger";
import fastifySwaggerUI, { type FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";

import fp from "fastify-plugin";

import type { ServerOptions } from "../options";

import { getSafeOptions } from "../options.safe";

export const setupSwagger = fp((async (fastify, options) => {
  const safeOptions = getSafeOptions(options);

  const swaggerOptions: SwaggerOptions = {
    openapi: {
      ...options.plugins?.swagger?.openapi,
      info: {
        title: "@ovineko/fastify",
        version: "1.0.0",
        ...options.plugins?.swagger?.openapi?.info,
      },
      openapi: "3.1.1",
    },

    transformObject: (document: any) => {
      if ("swaggerObject" in document) {
        throw new Error("swaggerObject");
      }

      const openapi = document.openapiObject;

      // return patchOpenapiByRegisteredSchemas(openapi);

      return openapi;
    },
  };
  await fastify.register(fastifySwagger, swaggerOptions);

  const swaggerUiOptions: FastifySwaggerUiOptions = {
    routePrefix: safeOptions.plugins.swagger.prefix,
    ...options.plugins?.swagger?.ui,
    uiConfig: {
      deepLinking: false,
      displayRequestDuration: true,
      docExpansion: "list",
      ...options.plugins?.swagger?.ui?.uiConfig,
    },
  };
  await fastify.register(fastifySwaggerUI, swaggerUiOptions);
}) satisfies FastifyPluginAsync<ServerOptions>);
