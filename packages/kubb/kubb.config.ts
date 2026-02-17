import { defineConfig } from "./dist";

export default defineConfig({
  config: {
    hooks: {
      // done: [],
    },
    input: {
      path: "example/swagger.json",
    },
    output: {
      path: "example/client",
    },
  },
  plugins: {
    client: {
      enabled: false,
    },
    faker: {
      enabled: true,
    },
    msw: {
      enabled: true,
    },
    zod: {
      enabled: false,
    },
  },
});
