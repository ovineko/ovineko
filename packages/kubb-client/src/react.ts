import { createContext, createElement, useContext } from "react";

import type { ClientWithSetup } from "./core/types.js";

import { getGlobalClient } from "./core/singleton.js";

const ApiClientContext = createContext<ClientWithSetup | null>(null);

/**
 * Provides an API client instance to the component tree.
 */
export function ApiClientProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client: ClientWithSetup;
}): React.ReactElement {
  return createElement(ApiClientContext.Provider, { value: client }, children);
}

/**
 * Returns the API client from context, falling back to the global singleton.
 */
export function useApiClient(): ClientWithSetup {
  const contextClient = useContext(ApiClientContext);
  return contextClient ?? getGlobalClient();
}

export { createClient } from "./core/client.js";
export { getGlobalClient, resetGlobalClient, setGlobalClient } from "./core/singleton.js";
// Re-export core types and utilities for convenience
export type { Client, ClientConfiguration, ClientSetup, ClientWithSetup } from "./core/types.js";
