import { isChunkError } from "../isChunkError";
import { logMessage } from "../log";
import { getOptions } from "../options";
import { attemptReload } from "../reload";
import { getRetryInfoForBeacon, getRetryStateFromUrl, updateRetryStateInUrl } from "../retryState";
import { sendBeacon } from "../sendBeacon";
import { shouldIgnoreMessages } from "../shouldIgnore";

export const listenInternal = (serializeError: (error: unknown) => string) => {
  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [];
  const retryState = getRetryStateFromUrl();

  if (retryState && retryState.retryAttempt >= reloadDelays.length) {
    console.log(
      logMessage(
        `Retry limit exceeded (${retryState.retryAttempt}/${reloadDelays.length}), marking as fallback shown`,
      ),
    );
    updateRetryStateInUrl(retryState.retryId, -1);
  }

  const wa = globalThis.window.addEventListener.bind(globalThis.window);

  wa(
    "error",
    (event) => {
      const shouldIgnore = shouldIgnoreMessages([event.message]);

      if (!shouldIgnore) {
        console.error(logMessage("error:capture:"), event);
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
      console.error(logMessage("unhandledrejection:"), event);
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
      console.error(logMessage("CSP violation:"), event.blockedURI, event.violatedDirective);
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
      console.error(logMessage("vite:preloadError:"), event);
    }

    event.preventDefault();
    attemptReload(event);
  });
};
