import { join } from "node:path";

import { defineConfig } from "./eslint-override-config.js";
import packageJSON from "./package.json" with { type: "json" };

export { globalIgnores } from "@shibanet0/datamitsu-config/eslint";

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
