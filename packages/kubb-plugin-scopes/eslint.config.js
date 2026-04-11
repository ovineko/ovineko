import { defineConfig } from "@ovineko/datamitsu-config/eslint-override-config.js";
import { join } from "node:path";

import packageJSON from "./package.json" with { type: "json" };

const config = await defineConfig(
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

export default config;
