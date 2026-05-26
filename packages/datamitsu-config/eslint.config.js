import { join } from "node:path";

import { defineConfig } from "./eslint-override-config.js";
import packageJSON from "./package.json" with { type: "json" };

export * from "./eslint-override-config.js";

export default defineConfig(
  /** @type {import('@shibanet0/datamitsu-config/type-fest').PackageJson} */ (packageJSON),
  undefined,
  {
    plugins: {
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
    },
  },
);
