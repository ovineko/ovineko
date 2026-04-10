// Use relative path because kubb CLI resolves modules outside pnpm workspace
// In a real project, use: import { defineConfig } from "@ovineko/kubb";
import { defineConfig } from "../../kubb/dist/index.js";

export default defineConfig({
  config: {
    input: {
      path: "./test-integration/petstore-minimal.yaml",
    },
    output: {
      path: "./test-integration/gen",
    },
  },
  plugins: {
    client: { enabled: true },
    faker: { enabled: false },
    msw: { enabled: false },
    swr: { disabled: true },
    zod: { enabled: false },
  },
  useOvinekoClient: true,
});
