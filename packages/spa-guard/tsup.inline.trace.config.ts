import { defineConfig } from "tsup";

import { tsupInlineOptions } from "./tsup.inline.config";

export default defineConfig({
  ...tsupInlineOptions,
  entry: ["src/inline-trace/index.ts"],
  outDir: "dist-inline-trace",
});
