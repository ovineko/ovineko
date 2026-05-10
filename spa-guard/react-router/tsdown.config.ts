import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: ["src/index.tsx"],
  outputOptions: {
    entryFileNames: "[name].js",
  },
});
