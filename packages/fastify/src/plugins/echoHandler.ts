import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import fp from "fastify-plugin";

import type { CreateServerOptions } from "../types";

// oxlint-disable-next-line typescript/no-empty-interface
interface EchoResponse extends Omit<
  FastifyRequest,
  | "compileValidationSchema"
  | "getDecorator"
  | "getValidationFunction"
  | "is404"
  | "log"
  | "raw"
  | "req"
  | "routeOptions"
  | "setDecorator"
  | "socket"
  | "validateInput"
> {}

const getEchoResponse = (req: FastifyRequest): EchoResponse => ({
  body: req.body || "",
  headers: req.headers,
  host: req.host,
  hostname: req.hostname,
  id: req.id,
  ip: req.ip,
  ips: req.ips ?? [],
  method: req.method,
  originalUrl: req.originalUrl,
  params: req.params,
  port: req.port,
  protocol: req.protocol,
  query: req.query,
  server: req.server,
  url: req.url,
});

export const echoHandler = fp((async (fastify) => {
  await fastify.register((fastify) => {
    fastify.all("/echo", (req) => getEchoResponse(req));
  });
}) satisfies FastifyPluginAsync<CreateServerOptions>);
