import type { Rule } from "eslint";

const SPA_GUARD_SOURCE = "@ovineko/spa-guard/react";
const SPA_GUARD_IMPORT = "lazyWithRetry";

const rule: Rule.RuleModule = {
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (source !== "react") {
          return;
        }

        const lazySpecifier = node.specifiers.find(
          (s) =>
            s.type === "ImportSpecifier" &&
            s.imported.type === "Identifier" &&
            s.imported.name === "lazy",
        );

        if (!lazySpecifier) {
          return;
        }

        const otherSpecifiers = node.specifiers.filter((s) => s !== lazySpecifier);

        context.report({
          data: { spaGuardSource: SPA_GUARD_SOURCE },
          *fix(fixer) {
            const localName = lazySpecifier.local.name;
            const aliasedImport =
              localName === "lazy" ? SPA_GUARD_IMPORT : `${SPA_GUARD_IMPORT} as ${localName}`;

            const spaGuardLine = `import { ${aliasedImport} } from "${SPA_GUARD_SOURCE}";`;

            if (otherSpecifiers.length === 0) {
              yield fixer.replaceText(node, spaGuardLine);
            } else {
              const remainingNames = otherSpecifiers.map((s) => {
                if (s.type === "ImportSpecifier" && s.imported.type === "Identifier") {
                  return s.imported.name === s.local.name
                    ? s.local.name
                    : `${s.imported.name} as ${s.local.name}`;
                }
                return s.local.name;
              });

              const reactLine = `import { ${remainingNames.join(", ")} } from "react";`;

              yield fixer.replaceText(node, `${reactLine}\n${spaGuardLine}`);
            }
          },
          messageId: "noDirectLazy",
          node: lazySpecifier,
        });
      },
    };
  },

  meta: {
    docs: {
      description:
        "Disallow importing lazy from React directly. Use lazyWithRetry from @ovineko/spa-guard/react instead.",
      recommended: true,
    },
    fixable: "code",
    messages: {
      noDirectLazy:
        'Use "lazyWithRetry" from "{{ spaGuardSource }}" instead of "lazy" from "react".',
    },
    schema: [],
    type: "suggestion",
  },
};

export default rule;
