import type { BeaconSchema } from ".";

const STRING_FIELDS = [
  "appName",
  "errorMessage",
  "eventMessage",
  "eventName",
  "retryId",
  "serialized",
] as const;

export function parseBeacon(data: unknown): BeaconSchema {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid beacon");
  }
  const d = data as Record<string, unknown>;
  const result: BeaconSchema = {};

  for (const field of STRING_FIELDS) {
    if (field in d) {
      if (typeof d[field] !== "string") {
        throw new TypeError(`Beacon validation failed: ${field} must be a string`);
      }
      (result as Record<string, unknown>)[field] = d[field];
    }
  }

  if ("retryAttempt" in d) {
    if (typeof d.retryAttempt !== "number") {
      throw new TypeError("Beacon validation failed: retryAttempt must be a number");
    }
    result.retryAttempt = d.retryAttempt;
  }

  return result;
}
