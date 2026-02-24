import type { Rule } from "eslint";

const SPA_GUARD_SOURCE = "@ovineko/spa-guard-react";
const SPA_GUARD_IMPORT = "lazyWithRetry";

/**
 * Resolve the replacement name for references being renamed.
 * When `localName` is "lazy" and lazyWithRetry is already imported, use the
 * existing local name. Otherwise fall back to the canonical import name.
 */
function getReplaceName(
  localName: string,
  alreadyImported: boolean,
  existingLocalName: string,
): string {
  if (localName !== "lazy") {
    return existingLocalName;
  }
  return alreadyImported ? existingLocalName : SPA_GUARD_IMPORT;
}

/**
 * Return true when `replaceName` is shadowed at any reference site of
 * `varName`, meaning autofix would change runtime semantics.
 */
function isReplaceShadowed(
  sourceCode: Rule.RuleContext["sourceCode"],
  varName: string,
  replaceName: string,
  skipIdentifier: any,
): boolean {
  const scope = sourceCode.getScope(skipIdentifier);
  const variable = scope.variables.find((v) => v.name === varName);
  if (!variable) {
    return false;
  }
  for (const ref of variable.references) {
    if (ref.identifier === skipIdentifier) {
      continue;
    }
    let s: any = sourceCode.getScope(ref.identifier);
    while (s && s.type !== "module" && s.type !== "global") {
      if (s.variables.some((sv: any) => sv.name === replaceName)) {
        return true;
      }
      s = s.upper;
    }
  }
  return false;
}

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

            // Check if lazyWithRetry is already imported from the spa-guard source
            // to avoid injecting a duplicate import declaration.
            // Also capture the local name in case it's aliased (e.g. `lazyWithRetry as lwr`).
            let alreadyImported = false;
            let existingLocalName = SPA_GUARD_IMPORT;
            for (const stmt of context.sourceCode.ast.body as any[]) {
              if (
                stmt.type === "ImportDeclaration" &&
                stmt.source.value === SPA_GUARD_SOURCE &&
                stmt.importKind !== "type"
              ) {
                const spec = stmt.specifiers.find(
                  (s: any) =>
                    s.type === "ImportSpecifier" &&
                    s.importKind !== "type" &&
                    s.imported?.type === "Identifier" &&
                    s.imported?.name === SPA_GUARD_IMPORT,
                );
                if (spec) {
                  alreadyImported = true;
                  existingLocalName = spec.local.name;
                  break;
                }
              }
            }

            // Safety check: if references will be renamed, verify the
            // replacement name is not shadowed at any reference location.
            // When shadowed, the renamed identifier would resolve to the
            // local binding instead of the import, changing runtime semantics.
            if (localName === "lazy" || alreadyImported) {
              const checkReplaceName = getReplaceName(
                localName,
                alreadyImported,
                existingLocalName,
              );
              const checkVarName = localName === "lazy" ? "lazy" : localName;

              if (checkReplaceName !== checkVarName) {
                const checkScope = context.sourceCode.getScope(node);

                // Check module scope for an existing binding with the replacement
                // name *before* iterating references. This catches cases where the
                // import has no usage references (e.g. `import { lazy } from "react"`
                // with no `lazy()` calls but an existing `const lazyWithRetry = 1`).
                const isModuleOrGlobal =
                  checkScope.type === "module" || checkScope.type === "global";
                if (
                  !alreadyImported &&
                  isModuleOrGlobal &&
                  checkScope.variables.some((sv: any) => sv.name === checkReplaceName)
                ) {
                  return; // Abort autofix: replacement name conflicts at module scope
                }

                if (
                  isReplaceShadowed(
                    context.sourceCode,
                    checkVarName,
                    checkReplaceName,
                    lazySpecifier.local,
                  )
                ) {
                  return; // Abort autofix: replacement name is shadowed
                }
              }
            }

            if (otherSpecifiers.length === 0) {
              yield alreadyImported ? fixer.remove(node) : fixer.replaceText(node, spaGuardLine);
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

              yield alreadyImported
                ? fixer.replaceText(node, reactLine)
                : fixer.replaceText(node, `${reactLine}\n${spaGuardLine}`);
            }

            // Rename all references to `lazy` in the code (skip aliased imports).
            // When lazyWithRetry is already imported (possibly aliased), use its
            // local name so references resolve to the existing binding.
            if (localName === "lazy") {
              const replaceName = alreadyImported ? existingLocalName : SPA_GUARD_IMPORT;
              const scope = context.sourceCode.getScope(node);
              const variable = scope.variables.find((v) => v.name === "lazy");
              if (variable) {
                for (const ref of variable.references) {
                  if (ref.identifier !== lazySpecifier.local) {
                    yield fixer.replaceText(ref.identifier, replaceName);
                  }
                }
              }
            } else if (alreadyImported) {
              // Aliased lazy (e.g. `lazy as myLazy`) when lazyWithRetry is already
              // imported: rename alias references to use the existing binding's local name.
              const scope = context.sourceCode.getScope(node);
              const variable = scope.variables.find((v) => v.name === localName);
              if (variable) {
                for (const ref of variable.references) {
                  if (ref.identifier !== lazySpecifier.local) {
                    yield fixer.replaceText(ref.identifier, existingLocalName);
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
