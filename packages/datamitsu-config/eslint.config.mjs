import { join } from "node:path";

import packageJSON from "./package.json" with { type: "json" };
import { defineConfig } from "./eslint-override-config.mjs";

export * from "./eslint-override-config.mjs";

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
