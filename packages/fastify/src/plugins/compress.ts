import fastifyCompress, { type FastifyCompressOptions } from "@fastify/compress";
import type { FastifyPluginAsync } from "fastify";

import fp from "fastify-plugin";

import type { CreateServerOptions } from "../types";

export const setupCompress = fp((async (fastify, options) => {
  const compressOptions: FastifyCompressOptions = {
    ...options.plugins?.compress,
  };

  await fastify.register(fastifyCompress, compressOptions);
}) satisfies FastifyPluginAsync<CreateServerOptions>);
