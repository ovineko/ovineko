import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: ["src/**/*.tsx*", "!src/**/*.spec.tsx*", "!src/**/*.test.tsx*"],
  outputOptions: {
    entryFileNames: "[name].js",
  },
});
