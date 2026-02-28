import type { Rule } from "eslint";

const BANNED_SOURCE = "react-error-boundary";
const SPA_GUARD_SOURCE = "@ovineko/spa-guard-react/error-boundary";

/** Named exports available from the spa-guard error-boundary module. */
const SUPPORTED_EXPORTS = new Set(["ErrorBoundary", "ErrorBoundaryProps", "FallbackProps"]);

const rule: Rule.RuleModule = {
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (source !== BANNED_SOURCE) {
          return;
        }

        // Only autofix when every specifier exists in the spa-guard module.
        // Default imports, namespace imports, and unsupported named imports
        // (e.g. withErrorBoundary) would produce uncompilable code after the
        // source rewrite.
        const hasDefaultImport = node.specifiers.some((s) => s.type === "ImportDefaultSpecifier");
        const hasNamespaceImport = node.specifiers.some(
          (s) => s.type === "ImportNamespaceSpecifier",
        );
        const hasUnsupportedNamed = node.specifiers.some(
          (s) =>
            s.type === "ImportSpecifier" &&
            s.imported.type === "Identifier" &&
            !SUPPORTED_EXPORTS.has(s.imported.name),
        );
        const canAutofix = !hasDefaultImport && !hasNamespaceImport && !hasUnsupportedNamed;

        context.report({
          data: { source, spaGuardSource: SPA_GUARD_SOURCE },
          fix: canAutofix
            ? (fixer) => fixer.replaceText(node.source, `"${SPA_GUARD_SOURCE}"`)
            : undefined,
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
