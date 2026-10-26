import { defineConfig } from "../datamitsu-config/eslint-override-config.mjs";
import packageJSON from "./package.json" with { type: "json" };

export default await defineConfig(
  /** @type {import("@shibanet0/datamitsu-config/type-fest").PackageJson} */ (packageJSON),
);
