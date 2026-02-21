import type { Logger } from "../logger";

import { getLogger, isInitialized, markInitialized, setLogger } from "../events/internal";
import { isChunkError } from "../isChunkError";
import { getOptions } from "../options";
import { attemptReload } from "../reload";
import { getRetryInfoForBeacon, getRetryStateFromUrl, updateRetryStateInUrl } from "../retryState";
import { sendBeacon } from "../sendBeacon";
import { shouldIgnoreMessages } from "../shouldIgnore";

export const listenInternal = (serializeError: (error: unknown) => string, logger?: Logger) => {
  setLogger(logger);

  if (isInitialized()) {
    return;
  }
  markInitialized();

  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [];
  const retryState = getRetryStateFromUrl();

  if (retryState && retryState.retryAttempt >= reloadDelays.length) {
    getLogger()?.retryLimitExceeded(retryState.retryAttempt, reloadDelays.length);
    updateRetryStateInUrl(retryState.retryId, -1);
  }

  const wa = globalThis.window.addEventListener.bind(globalThis.window);

  wa(
    "error",
    (event) => {
      const shouldIgnore = shouldIgnoreMessages([event.message]);

      if (!shouldIgnore) {
        getLogger()?.capturedError("error", event);
      }

      if (isChunkError(event)) {
        event.preventDefault();
        attemptReload(event);
        return;
      }

      const serialized = serializeError(event);
      sendBeacon({
        errorMessage: event.message,
        eventName: "error",
        serialized,
        ...getRetryInfoForBeacon(),
      });
    },
    true,
  );

  wa("unhandledrejection", (event) => {
    const errorMessage = String(event.reason);
    const shouldIgnore = shouldIgnoreMessages([errorMessage]);

    if (!shouldIgnore) {
      getLogger()?.capturedError("unhandledrejection", event);
    }

    if (isChunkError(event.reason)) {
      event.preventDefault();
      attemptReload(event.reason);
      return;
    }

    const serialized = serializeError(event);
    sendBeacon({
      errorMessage,
      eventName: "unhandledrejection",
      serialized,
      ...getRetryInfoForBeacon(),
    });
  });

  wa("securitypolicyviolation", (event) => {
    const eventMessage = `${event.violatedDirective}: ${event.blockedURI}`;
    const shouldIgnore = shouldIgnoreMessages([eventMessage]);

    if (!shouldIgnore) {
      getLogger()?.capturedError("csp", event.blockedURI, event.violatedDirective);
    }

    const serialized = serializeError(event);
    sendBeacon({
      eventMessage,
      eventName: "securitypolicyviolation",
      serialized,
      ...getRetryInfoForBeacon(),
    });
  });

  wa("vite:preloadError", (event) => {
    const errorMsg = (event as any)?.payload?.message || (event as any)?.message;
    const shouldIgnore = shouldIgnoreMessages([errorMsg]);

    if (!shouldIgnore) {
      getLogger()?.capturedError("vite:preloadError", event);
    }

    event.preventDefault();
    attemptReload((event as any)?.payload ?? event);
  });
};
