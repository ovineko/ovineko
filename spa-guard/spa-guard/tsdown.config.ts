import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: {
    _internal: "src/_internal.ts",
    "common/index": "src/common/index.ts",
    "i18n/index": "src/i18n/index.ts",
    "runtime/debug/index": "src/runtime/debug/index.ts",
    "runtime/index": "src/runtime/index.ts",
    "schema/index": "src/schema/index.ts",
    "schema/parse": "src/schema/parse.ts",
  },
  outputOptions: {
    entryFileNames: "[name].js",
  },
});
