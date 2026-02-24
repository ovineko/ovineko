import type { Rule } from "eslint";

const BANNED_SOURCE = "react-error-boundary";
const SPA_GUARD_SOURCE = "@ovineko/spa-guard-react/error-boundary";

const rule: Rule.RuleModule = {
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (source !== BANNED_SOURCE) {
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
      description: `Disallow importing ErrorBoundary from react-error-boundary directly. Use ${SPA_GUARD_SOURCE} instead.`,
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
