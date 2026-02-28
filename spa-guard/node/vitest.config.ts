import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**"],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    globals: true,
    pool: "threads",
  },
});
