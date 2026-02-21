import type { ESLint } from "eslint";

import { name } from "../../package.json";
import noDirectErrorBoundary from "./rules/no-direct-error-boundary";
import noDirectLazy from "./rules/no-direct-lazy";

const pluginName = `${name}/eslint`;

const rules = {
  "no-direct-error-boundary": noDirectErrorBoundary,
  "no-direct-lazy": noDirectLazy,
};

const plugin = {
  configs: {} as NonNullable<ESLint.Plugin["configs"]>,
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

const configs: NonNullable<ESLint.Plugin["configs"]> = plugin.configs;

export default plugin;
export { configs, rules };
