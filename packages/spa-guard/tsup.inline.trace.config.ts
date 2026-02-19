import tsup from "tsup";

export default tsup.defineConfig({
  clean: true,
  entry: ["src/inline/index.ts"],
  esbuildOptions(options) {
    options.drop = [];
  },
  format: "esm",
  minify: false,
  outDir: "dist-inline-trace",
  platform: "browser",
  splitting: false,
});
