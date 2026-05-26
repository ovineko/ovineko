import type { Operation } from "@kubb/oas";

export type HookType = "mutation" | "query";

/**
 * Determines whether an operation maps to a SWR query or mutation hook.
 *
 * GET requests are classified as "query" (data fetching).
 * All other HTTP methods (POST, PUT, PATCH, DELETE) are classified as "mutation" (data modification).
 */
export function determineHookType(operation: Operation): HookType {
  return operation.method.toUpperCase() === "GET" ? "query" : "mutation";
}
