import type { BeaconSchema } from "../schema";

import { FORCE_RETRY_MAGIC } from "./errors/ForceRetryError";
import { getOptions } from "./options";

export const KNOWN_BROWSER_NOISE = [
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
  "Non-Error promise rejection captured",
] as const;

export const CROSS_ORIGIN_ERROR = "Script error.";

/**
 * Checks if any of the provided messages should be ignored based on errors.ignore option.
 */
export const shouldIgnoreMessages = (messages: (string | undefined)[]): boolean => {
  const options = getOptions();
  const ignorePatterns = [
    ...(options.errors?.ignoreKnownNoise !== false ? KNOWN_BROWSER_NOISE : []),
    ...(options.errors?.ignore ?? []),
  ].filter((p) => p !== "");

  if (ignorePatterns.length === 0) {
    return false;
  }

  const validMessages = messages.filter((msg): msg is string => typeof msg === "string");

  return validMessages.some((message) =>
    ignorePatterns.some((pattern) => message.includes(pattern)),
  );
};

/**
 * Checks if any of the provided messages match a forceRetry pattern.
 */
export const shouldForceRetry = (messages: (string | undefined)[]): boolean => {
  const options = getOptions();
  const forceRetryPatterns = [...(options.errors?.forceRetry ?? []), FORCE_RETRY_MAGIC].filter(
    (p) => p !== "",
  );

  const validMessages = messages.filter((msg): msg is string => typeof msg === "string");

  return validMessages.some((message) =>
    forceRetryPatterns.some((pattern) => message.includes(pattern)),
  );
};

/**
 * Checks if a beacon should be ignored based on errors.ignore option.
 */
export const shouldIgnoreBeacon = (beacon: BeaconSchema): boolean => {
  return shouldIgnoreMessages([beacon.errorMessage, beacon.eventMessage]);
};
