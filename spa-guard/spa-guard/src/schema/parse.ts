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

const MAX_STRING_FIELD_LENGTH = 500;
const MAX_SERIALIZED_LENGTH = 10_000;

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
      const maxLen = field === "serialized" ? MAX_SERIALIZED_LENGTH : MAX_STRING_FIELD_LENGTH;
      if ((d[field] as string).length > maxLen) {
        throw new TypeError(`Beacon validation failed: ${field} exceeds maximum length`);
      }
      (result as Record<string, unknown>)[field] = d[field];
    }
  }

  for (const field of ["retryAttempt", "httpStatus"] as const) {
    if (field in d) {
      if (typeof d[field] !== "number" || !Number.isFinite(d[field] as number)) {
        throw new TypeError(`Beacon validation failed: ${field} must be a finite number`);
      }
      result[field] = d[field] as number;
    }
  }

  return result;
}
