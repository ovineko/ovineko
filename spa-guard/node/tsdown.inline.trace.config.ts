import { defineConfig } from "tsdown";

export default defineConfig({
  deps: { alwaysBundle: [/.*/] },
  dts: false,
  entry: ["src/inline-trace/index.ts"],
  outDir: "dist-inline-trace",
  outputOptions: {
    entryFileNames: "[name].js",
  },
  platform: "browser",
});
