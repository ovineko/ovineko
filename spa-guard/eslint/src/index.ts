import type { ESLint, Linter } from "eslint";

import { name } from "../package.json";
import noDirectErrorBoundary from "./rules/no-direct-error-boundary";
import noDirectLazy from "./rules/no-direct-lazy";

const pluginName = name;

const rules = {
  "no-direct-error-boundary": noDirectErrorBoundary,
  "no-direct-lazy": noDirectLazy,
};

interface Configs {
  [key: string]: Linter.Config;
  recommended: Linter.Config;
}

const plugin = {
  configs: {} as Configs,
  rules,
} satisfies ESLint.Plugin;

plugin.configs = {
  recommended: {
    plugins: {
      [pluginName]: plugin,
    },
    rules: {
      [`${pluginName}/no-direct-error-boundary`]: "error",
      [`${pluginName}/no-direct-lazy`]: "error",
    },
  },
};

const configs: Configs = plugin.configs;

export default plugin;
export { configs, rules };
