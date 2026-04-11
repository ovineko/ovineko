import type { Operation } from "@kubb/oas";

/**
 * Scope-bearing security scheme types in the OpenAPI spec.
 * OAuth2 always carries scopes; openIdConnect may carry them too.
 * The `oas` library maps both to the `"OAuth2"` SecurityType.
 */
const SCOPE_BEARING_TYPES = new Set(["OAuth2"]);

/**
 * Extracts deduplicated OAuth2 / OpenID Connect scopes from an operation's
 * security requirements.
 *
 * Returns an empty array when the operation has no security schemes or
 * none of its schemes carry scopes.
 */
export function extractScopes(operation: Operation): string[] {
  const grouped = operation.getSecurityWithTypes();
  const scopes = new Set<string>();

  for (const orGroup of grouped) {
    // `false` means the entire OR-group was invalid
    if (orGroup === false) {
      continue;
    }

    for (const andEntry of orGroup) {
      // `false` means this specific scheme reference was invalid
      if (andEntry === false) {
        continue;
      }

      if (!SCOPE_BEARING_TYPES.has(andEntry.type)) {
        continue;
      }

      const requirements = andEntry.security._requirements;
      if (requirements) {
        for (const scope of requirements) {
          scopes.add(scope);
        }
      }
    }
  }

  return [...scopes];
}
