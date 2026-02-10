import type { captureException as captureExceptionType } from "@sentry/react";
import type * as SentryReact from "@sentry/react";

let _promise: null | Promise<typeof SentryReact>;

export const captureException = async (
  ...args: Parameters<typeof captureExceptionType>
): Promise<string> => {
  if (_promise === null) {
    return "";
  }

  try {
    _promise ??= import("@sentry/react");
    const sentry = await _promise;
    return sentry.captureException(...args);
  } catch {
    _promise = null;
    return "";
  }
};
