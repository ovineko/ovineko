import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    coverage: {
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**"],
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text", "json", "html"],
    },
    globals: true,
    pool: "threads",
  },
});
