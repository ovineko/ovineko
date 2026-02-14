import { createServer } from "../src";

const { fastify, getSwaggerJSON, listen } = await createServer({
  listen: {
    port: 8080,
    printRoutes: true,
  },
  logger: {
    mode: "human",
  },
  swagger: {
    enabled: true,
  },
});

fastify.get("/example", () => {
  return "example";
});

export { fastify, getSwaggerJSON, listen };
