import type { Options } from "tsup";

import { defineConfig } from "tsup";

export const tsupInlineTraceOptions: Options = {
  clean: true,
  entry: ["src/inline-trace/index.ts"],
  format: "esm",
  minify: "terser",
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  outDir: "dist-inline-trace",
  platform: "browser",
  splitting: false,
  terserOptions: {
    compress: {
      drop_console: false,
      passes: 3,
      pure_funcs: [],
      unsafe: true,
      unsafe_arrows: true,
      unsafe_methods: true,
    },
    format: {
      comments: false,
    },
    mangle: {
      toplevel: true,
    },
  },
};

export default defineConfig(tsupInlineTraceOptions);
