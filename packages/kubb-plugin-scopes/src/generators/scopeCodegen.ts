import type { Operation } from "@kubb/oas";

import { extractScopes } from "../utils/extractScopes.js";

export interface ScopeCodegenResult {
  functionBody: string;
  importPath: string;
  scopes: string[];
}

/**
 * Generates the code artifacts for a scopes function from an OpenAPI operation.
 * Returns null if the operation has no OAuth/OIDC scopes.
 */
export function generateScopeCode(
  operation: Operation,
  importPath: string,
): null | ScopeCodegenResult {
  const scopes = extractScopes(operation);

  if (scopes.length === 0) {
    return null;
  }

  const scopeValues = scopes.map((s) => `scope("${s}")`).join(", ");

  return {
    functionBody: `return [${scopeValues}]`,
    importPath,
    scopes,
  };
}
