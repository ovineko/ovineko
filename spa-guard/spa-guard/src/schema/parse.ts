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

export const MAX_STRING_FIELD_LENGTH = 500;
export const MAX_SERIALIZED_LENGTH = 10_000;

/**
 * Caps a string at the length `parseBeacon` accepts. An over-long field makes the whole
 * beacon unparseable, and `navigator.sendBeacon` cannot observe the rejection — so the
 * report is lost silently. Always pass user- or URL-derived values through this.
 */
export const clampBeaconField = (value: string): string =>
  value.length > MAX_STRING_FIELD_LENGTH ? value.slice(0, MAX_STRING_FIELD_LENGTH) : value;

export const clampSerializedBeaconField = (value: string): string =>
  value.length > MAX_SERIALIZED_LENGTH ? value.slice(0, MAX_SERIALIZED_LENGTH) : value;

export const normalizeBeacon = (beacon: BeaconSchema): BeaconSchema => {
  const result: BeaconSchema = {};

  for (const field of STRING_FIELDS) {
    const value = beacon[field];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[field] =
        field === "serialized" ? clampSerializedBeaconField(value) : clampBeaconField(value);
    }
  }

  for (const field of ["retryAttempt", "httpStatus"] as const) {
    const value = beacon[field];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[field] = value;
    }
  }

  return result;
};

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
