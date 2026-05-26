import type { Operation } from "@kubb/oas";

/**
 * The `oas` library maps both OAuth2 and openIdConnect to the `"OAuth2"` SecurityType.
 */
const SCOPE_BEARING_TYPE = "OAuth2";

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

  const validGroups = grouped.filter(
    (orGroup): orGroup is Exclude<typeof orGroup, false> => orGroup !== false,
  );

  for (const orGroup of validGroups) {
    for (const andEntry of orGroup) {
      if (andEntry === false || andEntry.type !== SCOPE_BEARING_TYPE) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const requirements = andEntry.security._requirements;
      if (Array.isArray(requirements)) {
        for (const req of requirements) {
          scopes.add(req);
        }
      }
    }
  }

  return [...scopes];
}
