import type { ClientConfiguration, ClientWithSetup } from "./types.js";

import { createClient } from "./client.js";

let globalClient: ClientWithSetup | null = null;

/**
 * Returns the global client instance, creating one lazily on first call.
 */
export function getGlobalClient(config?: ClientConfiguration): ClientWithSetup {
  if (!globalClient) {
    globalClient = createClient(config);
  }
  return globalClient;
}

/**
 * Resets the global client to null. Primarily for testing.
 */
export function resetGlobalClient(): void {
  globalClient = null;
}

/**
 * Replaces the global client with a custom instance.
 */
export function setGlobalClient(client: ClientWithSetup): void {
  globalClient = client;
}
