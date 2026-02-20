import type { BeaconSchema } from "../schema";

import { getOptions } from "./options";

/**
 * Checks if any of the provided messages should be ignored based on ignoredErrors option.
 */
export const shouldIgnoreMessages = (messages: (string | undefined)[]): boolean => {
  const options = getOptions();
  const ignoredErrors = options.ignoredErrors ?? [];

  if (ignoredErrors.length === 0) {
    return false;
  }

  const validMessages = messages.filter((msg): msg is string => typeof msg === "string");

  return validMessages.some((message) =>
    ignoredErrors.some((ignored) => message.includes(ignored)),
  );
};

/**
 * Checks if a beacon should be ignored based on ignoredErrors option.
 */
export const shouldIgnoreBeacon = (beacon: BeaconSchema): boolean => {
  return shouldIgnoreMessages([beacon.errorMessage, beacon.eventMessage]);
};
