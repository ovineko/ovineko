// Use relative path because kubb CLI resolves modules outside pnpm workspace
// In a real project, use: import { defineConfig } from "@ovineko/kubb";
import { defineConfig } from "../../kubb/dist/index.js";

export default defineConfig({
  config: {
    input: {
      path: "./test-integration/petstore-oauth.yaml",
    },
    output: {
      path: "./test-integration/gen",
    },
  },
  plugins: {
    client: { enabled: true },
    faker: { enabled: false },
    msw: { enabled: false },
    scopes: { enabled: true },
    swr: { disabled: true },
    zod: { enabled: false },
  },
  useOvinekoClient: true,
});
