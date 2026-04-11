/* eslint-disable react-refresh/only-export-components */
import { createContext, createElement, useContext, useMemo } from "react";

import type { ApiScope } from "./types.js";

import { getMissingScopes, isAvailableScopes } from "./validation.js";

const ScopesContext = createContext<ApiScope[] | null>(null);

/**
 * Conditionally renders children based on whether the user has the required scopes.
 *
 * Shows `fallback` (defaults to `null`) when the user lacks access.
 */
export function RequireScopes({
  children,
  fallback = null,
  scopes: requiredScopes,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  scopes: ApiScope[] | ApiScope[][];
}): null | React.ReactElement {
  const { hasAccess } = useScopes();
  return (hasAccess(requiredScopes) ? children : fallback) as null | React.ReactElement;
}

/**
 * Provides user scopes to the component tree for access control checks.
 */
export function ScopesProvider({
  children,
  scopes,
}: {
  children: React.ReactNode;
  scopes: ApiScope[];
}): React.ReactElement {
  return createElement(ScopesContext.Provider, { value: scopes }, children);
}

/**
 * Returns the user's scopes and access check utilities from the nearest ScopesProvider.
 *
 * @throws {Error} if used outside of a ScopesProvider
 */
export function useScopes(): {
  getMissingScopes: (requiredScopes: ApiScope[] | ApiScope[][]) => ApiScope[];
  hasAccess: (requiredScopes: ApiScope[] | ApiScope[][]) => boolean;
  userScopes: ApiScope[];
} {
  const scopes = useContext(ScopesContext);
  if (scopes === null) {
    throw new Error("useScopes must be used within a ScopesProvider");
  }

  return useMemo(
    () => ({
      getMissingScopes: (requiredScopes: ApiScope[] | ApiScope[][]) =>
        getMissingScopes(scopes, requiredScopes),
      hasAccess: (requiredScopes: ApiScope[] | ApiScope[][]) =>
        isAvailableScopes(scopes, requiredScopes),
      userScopes: scopes,
    }),
    [scopes],
  );
}
