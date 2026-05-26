import type { Operation } from "@kubb/oas";

import type { HookType } from "../utils/determineHookType.js";

import { determineHookType } from "../utils/determineHookType.js";
import { extractScopes } from "../utils/extractScopes.js";

export interface SwrScopeCodegenResult {
  functionBody: string;
  hasPathParams: boolean;
  hasQueryParams: boolean;
  hookType: HookType;
  scopeGetterName: string;
}

/**
 * Generates the code artifacts for an SWR scoped hook wrapper from an OpenAPI operation.
 *
 * Returns null if the operation has no OAuth/OIDC scopes, since there is nothing to guard.
 *
 * For hooks WITH params (query OR path params): generates a wrapper accepting (params, options?)
 * that forwards both to the original hook with shouldFetch gated by scope access.
 *
 * For hooks WITHOUT params: generates a wrapper accepting (options?) that forwards
 * to the original hook with shouldFetch gated by scope access.
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

  // Check for path params and query params
  const hasPathParams = operation.path.includes("{");
  const hasQueryParams =
    operation.schema?.parameters?.some(
      (p: any) => typeof p === "object" && !("$ref" in p) && p.in === "query",
    ) ?? false;

  const sharedLines = [
    "const { hasAccess } = useScopes();",
    `const requiredScopes = ${scopeGetterName}();`,
    "const hasRequiredAccess = hasAccess(requiredScopes);",
    "",
  ];

  // Determine hook signature based on parameters and hook type
  let callLines: string[];

  if (hasPathParams && hasQueryParams && hookType === "mutation") {
    // Mutation hooks with both params: 3-param (pathParams, queryParams, options)
    callLines = [
      "return originalHook(pathParams, queryParams, {",
      "  ...options,",
      "  shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
      "});",
    ];
  } else if (hasPathParams || hasQueryParams) {
    // Query hooks OR mutation hooks with only one param type: 2-param (params, options)
    callLines = [
      "return originalHook(params, {",
      "  ...options,",
      "  shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
      "});",
    ];
  } else {
    // No params: 1-param (options)
    callLines = [
      "return originalHook({",
      "  ...options,",
      "  shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
      "});",
    ];
  }

  return {
    functionBody: [...sharedLines, ...callLines].join("\n"),
    hasPathParams,
    hasQueryParams,
    hookType,
    scopeGetterName,
  };
}
