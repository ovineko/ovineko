import type { Rule } from "eslint";

import { name } from "../../../package.json";

const BANNED_SOURCES = new Set(["react-error-boundary"]);
const SPA_GUARD_SOURCE = `${name}/react-error-boundary`;

const rule: Rule.RuleModule = {
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") {
          return;
        }

        if (!BANNED_SOURCES.has(source)) {
          return;
        }

        context.report({
          data: { source, spaGuardSource: SPA_GUARD_SOURCE },
          fix(fixer) {
            return fixer.replaceText(node.source, `"${SPA_GUARD_SOURCE}"`);
          },
          messageId: "noDirectErrorBoundary",
          node: node.source,
        });
      },
    };
  },

  meta: {
    docs: {
      description:
        "Disallow importing ErrorBoundary from react-error-boundary directly. Use @ovineko/spa-guard/react-error-boundary instead.",
      recommended: true,
    },
    fixable: "code",
    messages: {
      noDirectErrorBoundary:
        'Import ErrorBoundary from "{{ spaGuardSource }}" instead of "{{ source }}".',
    },
    schema: [],
    type: "suggestion",
  },
};

export default rule;
