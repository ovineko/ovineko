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
        // JSX generators are thin wrappers around *Codegen.ts using Kubb React fabric
        // hooks (useOperationManager, File, Function). They cannot be unit tested without
        // the full Kubb runtime. Covered by test-integration/ instead.
        "src/generators/scopes.tsx",
        "src/generators/swrScopes.tsx",
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
