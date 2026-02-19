import { emitEvent } from "../events/internal";
import { logMessage } from "../log";
import { getOptions } from "../options";
import { sendBeacon } from "../sendBeacon";

export const listenInternal = () => {
  emitEvent({ name: "test" });

  console.log("watchUnsafe");
  console.log(getOptions());

  sendBeacon({
    errorMessage: "errorMessage",
  });

  const wa = window.addEventListener;

  wa(
    "error",
    (event) => {
      console.error(logMessage("error:capture:"), event);
    },
    true,
  );

  wa("error", (event) => {
    console.error(logMessage("error:"), event);
  });

  wa("unhandledrejection", (event) => {
    console.error(logMessage("unhandledrejection:"), event);
  });

  wa("uncaughtException", (event) => {
    console.error(logMessage("uncaughtException:"), event);
  });

  wa("securitypolicyviolation", (event) => {
    console.error(logMessage("CSP violation:"), event.blockedURI, event.violatedDirective);
  });

  // Handle preload errors that occur during dynamic imports (e.g., stale chunks after deployment)
  // See: https://vite.dev/guide/build#load-error-handling
  wa("vite:preloadError", (event) => {
    console.error(logMessage("vite:preloadError:"), event);
  });
};
