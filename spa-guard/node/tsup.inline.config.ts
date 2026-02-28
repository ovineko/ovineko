import { defineConfig } from "tsup";

import { tsupInlineTraceOptions } from "./tsup.inline.trace.config";

export default defineConfig({
  ...tsupInlineTraceOptions,
  entry: ["src/inline/index.ts"],
  outDir: "dist-inline",
  terserOptions: {
    ...tsupInlineTraceOptions.terserOptions,
    compress: {
      ...(typeof tsupInlineTraceOptions.terserOptions?.compress === "object"
        ? tsupInlineTraceOptions.terserOptions.compress
        : {}),
      drop_console: true,
    },
  },
});
