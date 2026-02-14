import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";

import fp from "fastify-plugin";

import type { CreateServerOptions } from "../types";

export const setupSwagger = fp((async (fastify, options) => {
  await fastify.register(fastifySwagger, {
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
  });

  await fastify.register(fastifySwaggerUI, {
    routePrefix: "/swagger",
    ...options.swagger?.ui,
    uiConfig: {
      deepLinking: false,
      displayRequestDuration: true,
      docExpansion: "list",
      ...options.swagger?.ui?.uiConfig,
    },
  });
}) satisfies FastifyPluginAsync<CreateServerOptions>);
