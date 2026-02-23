import type { Rule } from "eslint";

import { name } from "../../../package.json";

const SPA_GUARD_SOURCE = `${name}/react`;
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
              const defaultSpec = otherSpecifiers.find((s) => s.type === "ImportDefaultSpecifier");
              const namedSpecs = otherSpecifiers.filter((s) => s.type === "ImportSpecifier");

              const declIsTypeOnly =
                (node as typeof node & { importKind?: string }).importKind === "type";

              const namedNames = namedSpecs.map((s) => {
                const spec = s as Rule.Node & {
                  imported: { name: string; type: string };
                  importKind?: string;
                };
                const isTypeOnly = !declIsTypeOnly && spec.importKind === "type";
                const typePrefix = isTypeOnly ? "type " : "";
                return spec.imported.name === s.local.name
                  ? `${typePrefix}${s.local.name}`
                  : `${typePrefix}${spec.imported.name} as ${s.local.name}`;
              });

              let reactLine: string;
              if (defaultSpec && namedNames.length > 0) {
                reactLine = `import ${defaultSpec.local.name}, { ${namedNames.join(", ")} } from "react";`;
              } else if (defaultSpec) {
                reactLine = `import ${defaultSpec.local.name} from "react";`;
              } else if (declIsTypeOnly) {
                reactLine = `import type { ${namedNames.join(", ")} } from "react";`;
              } else {
                reactLine = `import { ${namedNames.join(", ")} } from "react";`;
              }

              yield fixer.replaceText(node, `${reactLine}\n${spaGuardLine}`);
            }

            // Rename all references to `lazy` in the code (skip aliased imports)
            if (localName === "lazy") {
              const scope = context.sourceCode.getScope(node);
              const variable = scope.variables.find((v) => v.name === "lazy");
              if (variable) {
                for (const ref of variable.references) {
                  if (ref.identifier !== lazySpecifier.local) {
                    yield fixer.replaceText(ref.identifier, SPA_GUARD_IMPORT);
                  }
                }
              }
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
      description: `Disallow importing lazy from React directly. Use lazyWithRetry from ${SPA_GUARD_SOURCE} instead.`,
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
