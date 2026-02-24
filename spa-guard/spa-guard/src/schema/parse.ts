import type { BeaconSchema } from ".";

const STRING_FIELDS = [
  "appName",
  "errorContext",
  "errorMessage",
  "errorType",
  "eventMessage",
  "eventName",
  "retryId",
  "serialized",
  "url",
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

  for (const field of ["retryAttempt", "httpStatus"] as const) {
    if (field in d) {
      if (typeof d[field] !== "number") {
        throw new TypeError(`Beacon validation failed: ${field} must be a number`);
      }
      result[field] = d[field] as number;
    }
  }

  return result;
}
