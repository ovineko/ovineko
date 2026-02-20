import type { Rule } from "eslint";

import noDirectErrorBoundary from "./rules/no-direct-error-boundary";
import noDirectLazy from "./rules/no-direct-lazy";

const rules: Record<string, Rule.RuleModule> = {
  "no-direct-error-boundary": noDirectErrorBoundary,
  "no-direct-lazy": noDirectLazy,
};

const plugin = { configs: {} as Record<string, unknown>, rules };

plugin.configs = {
  recommended: {
    plugins: {
      "@ovineko/spa-guard": plugin,
    },
    rules: {
      "@ovineko/spa-guard/no-direct-error-boundary": "error",
      "@ovineko/spa-guard/no-direct-lazy": "error",
    },
  },
};

const { configs } = plugin;

export default plugin;
export { configs, rules };
