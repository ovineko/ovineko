import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    coverage: {
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/types.ts",
        "src/index.ts",
        // JSX generator is a thin wrapper around scopeCodegen.ts using Kubb React fabric
        // hooks (useOperationManager, File, Function). It cannot be unit tested without
        // the full Kubb runtime. Covered by test-integration/ instead.
        "src/generators/scopes.tsx",
      ],
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text", "json", "html"],
    },
    globals: true,
    globalSetup: "./test-integration/setup.ts",
    include: ["src/**/*.test.{ts,tsx}", "test-integration/**/*.test.ts"],
    pool: "threads",
  },
});
