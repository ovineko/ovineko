import { defineConfig } from "../packages/datamitsu-config/oxlint-override-config.mjs";
import packageJSON from "./package.json" with { type: "json" };

export default defineConfig(packageJSON);
