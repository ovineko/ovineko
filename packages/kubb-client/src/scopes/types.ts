/**
 * Phantom-branded string type for API scopes.
 * Prevents arbitrary strings from being used where scopes are expected.
 */
export type ApiScope = string & { readonly __brand: unique symbol };

/**
 * Creates a type-safe ApiScope value from a string literal.
 */
export function scope(value: string): ApiScope {
  return value as ApiScope;
}
