import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: {
    "react-error-boundary/index": "src/react-error-boundary/index.tsx",
    "react/index": "src/react/index.tsx",
  },
  outputOptions: {
    entryFileNames: "[name].js",
  },
});
