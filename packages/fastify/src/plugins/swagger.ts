import fastifySwagger, { type SwaggerOptions } from "@fastify/swagger";
import fastifySwaggerUI, { type FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";

import fp from "fastify-plugin";

import type { CreateServerOptions } from "../types";

export const setupSwagger = fp((async (fastify, options) => {
  const swaggerOptions: SwaggerOptions = {
    openapi: {
      ...options.swagger?.openapi,
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
    routePrefix: "/swagger",
    ...options.swagger?.ui,
    uiConfig: {
      deepLinking: false,
      displayRequestDuration: true,
      docExpansion: "list",
      ...options.swagger?.ui?.uiConfig,
    },
  };
  await fastify.register(fastifySwaggerUI, swaggerUiOptions);
}) satisfies FastifyPluginAsync<CreateServerOptions>);
