import { defineConfig } from "tsdown";

export default defineConfig({
  deps: { alwaysBundle: [/.*/] },
  dts: false,
  entry: ["src/inline/index.ts"],
  outDir: "dist-inline",
  outputOptions: {
    entryFileNames: "[name].js",
  },
  platform: "browser",
});
