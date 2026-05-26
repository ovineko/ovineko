import type { ApiScope } from "./types.js";

/**
 * Returns the scopes that the user is missing for the first satisfiable AND group.
 *
 * Returns the missing scopes from the AND group with the fewest missing items.
 * If all groups are fully missing, returns the missing scopes of the smallest group.
 * Returns empty array if requirements are satisfied or empty.
 */
export function getMissingScopes(
  userScopes: ApiScope[],
  requiredScopes: ApiScope[] | ApiScope[][],
): ApiScope[] {
  const normalized = normalizeScopes(requiredScopes);
  if (normalized.length === 0) {
    return [];
  }

  const userSet = new Set<string>(userScopes);

  let bestMissing: ApiScope[] | undefined;

  for (const andGroup of normalized) {
    const missing = andGroup.filter((s) => !userSet.has(s));
    if (missing.length === 0) {
      return [];
    }
    if (bestMissing === undefined || missing.length < bestMissing.length) {
      bestMissing = missing;
    }
  }

  return bestMissing ?? [];
}

/**
 * Checks if user scopes satisfy the required scopes using OR-of-ANDs logic.
 *
 * Required scopes format: [[A, B], [C]] means "(A AND B) OR C"
 * - Empty required scopes → true (no requirements)
 * - Each inner array is an AND group; at least one group must be fully satisfied.
 */
export function isAvailableScopes(
  userScopes: ApiScope[],
  requiredScopes: ApiScope[] | ApiScope[][],
): boolean {
  const normalized = normalizeScopes(requiredScopes);
  if (normalized.length === 0) {
    return true;
  }

  const userSet = new Set<string>(userScopes);

  return normalized.some((andGroup) => andGroup.every((s) => userSet.has(s)));
}

/**
 * Normalizes scopes input into OR-of-ANDs format (ApiScope[][]).
 *
 * - Empty array → [] (no requirements)
 * - Flat array [A, B] → [[A, B]] (single AND group)
 * - Nested array [[A, B], [C]] → [[A, B], [C]] (OR-of-ANDs, passthrough)
 */
export function normalizeScopes(scopes: ApiScope[] | ApiScope[][]): ApiScope[][] {
  if (scopes.length === 0) {
    return [];
  }

  if (Array.isArray(scopes[0])) {
    return scopes as ApiScope[][];
  }

  return [scopes as ApiScope[]];
}
