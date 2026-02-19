import { emitEvent } from "../events/internal";
import { isChunkError } from "../isChunkError";
import { logMessage } from "../log";
import { attemptReload } from "../reload";
import { sendBeacon } from "../sendBeacon";
import { serializeError } from "../serializeError";

export const listenInternal = () => {
  emitEvent({ name: "test" });

  const wa = window.addEventListener;

  wa(
    "error",
    (event) => {
      console.error(logMessage("error:capture:"), event);

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
      });
    },
    true,
  );

  wa("error", (event) => {
    console.error(logMessage("error:"), event);
  });

  wa("unhandledrejection", (event) => {
    console.error(logMessage("unhandledrejection:"), event);

    if (isChunkError(event.reason)) {
      event.preventDefault();
      attemptReload(event.reason);
      return;
    }

    const serialized = serializeError(event);
    sendBeacon({
      errorMessage: String(event.reason),
      eventName: "unhandledrejection",
      serialized,
    });
  });

  wa("uncaughtException", (event) => {
    console.error(logMessage("uncaughtException:"), event);

    const serialized = serializeError(event);
    sendBeacon({
      eventName: "uncaughtException",
      serialized,
    });
  });

  wa("securitypolicyviolation", (event) => {
    console.error(logMessage("CSP violation:"), event.blockedURI, event.violatedDirective);

    const serialized = serializeError(event);
    sendBeacon({
      eventMessage: `${event.violatedDirective}: ${event.blockedURI}`,
      eventName: "securitypolicyviolation",
      serialized,
    });
  });

  wa("vite:preloadError", (event) => {
    console.error(logMessage("vite:preloadError:"), event);

    event.preventDefault();
    attemptReload(event);
  });
};
