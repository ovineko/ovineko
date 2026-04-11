import type { Operation } from "@kubb/oas";

import type { HookType } from "../utils/determineHookType.js";

import { determineHookType } from "../utils/determineHookType.js";
import { extractScopes } from "../utils/extractScopes.js";

export interface SwrScopeCodegenResult {
  functionBody: string;
  hasPathParams: boolean;
  hookType: HookType;
  scopeGetterName: string;
}

/**
 * Generates the code artifacts for an SWR scoped hook wrapper from an OpenAPI operation.
 *
 * Returns null if the operation has no OAuth/OIDC scopes, since there is nothing to guard.
 *
 * For query hooks (GET): generates a wrapper accepting (params?, options?) that forwards
 * both to the original hook with shouldFetch gated by scope access.
 *
 * For mutation hooks (POST/PUT/PATCH/DELETE): generates a wrapper accepting (options?)
 * that forwards to the original hook with shouldFetch gated by scope access.
 */
export function generateSwrScopeCode(
  operation: Operation,
  scopeGetterName: string,
): null | SwrScopeCodegenResult {
  const scopes = extractScopes(operation);

  if (scopes.length === 0) {
    return null;
  }

  const hookType = determineHookType(operation);
  const hasPathParams = operation.path.includes("{");

  const sharedLines = [
    "const { hasAccess } = useScopes();",
    `const requiredScopes = ${scopeGetterName}();`,
    "const hasRequiredAccess = hasAccess(requiredScopes);",
    "",
  ];

  const callLines = hasPathParams
    ? [
        "return originalHook(params, {",
        "  ...options,",
        "  shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
        "});",
      ]
    : [
        "return originalHook({",
        "  ...options,",
        "  shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
        "});",
      ];

  return {
    functionBody: [...sharedLines, ...callLines].join("\n"),
    hasPathParams,
    hookType,
    scopeGetterName,
  };
}
