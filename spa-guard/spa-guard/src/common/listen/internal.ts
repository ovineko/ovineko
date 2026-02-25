import type { Logger } from "../logger";

import {
  emitEvent,
  getLogger,
  isInitialized,
  markInitialized,
  setLogger,
} from "../events/internal";
import { isChunkError } from "../isChunkError";
import { getAssetUrl, isLikely404, isStaticAssetError } from "../isStaticAssetError";
import { getOptions } from "../options";
import { attemptReload } from "../reload";
import {
  clearRetryStateFromUrl,
  getRetryInfoForBeacon,
  getRetryStateFromUrl,
  updateRetryStateInUrl,
} from "../retryState";
import { sendBeacon } from "../sendBeacon";
import { shouldForceRetry, shouldIgnoreMessages } from "../shouldIgnore";
import { handleStaticAssetFailure } from "../staticAssetRecovery";

export const listenInternal = (serializeError: (error: unknown) => string, logger?: Logger) => {
  if (isInitialized()) {
    return;
  }

  if (logger) {
    setLogger(logger);
  }

  markInitialized();

  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [];
  const retryState = getRetryStateFromUrl();

  if (retryState && retryState.retryAttempt >= reloadDelays.length) {
    getLogger()?.retryLimitExceeded(retryState.retryAttempt, reloadDelays.length);
    updateRetryStateInUrl(retryState.retryId, -1);
  }

  if (
    retryState &&
    (retryState.retryAttempt >= reloadDelays.length || retryState.retryAttempt === -1)
  ) {
    // If the page loads without a chunk error the -1 sentinel must be removed,
    // otherwise any future chunk error will skip retries entirely.
    // This also handles stale -1 state already present in the URL at startup.
    globalThis.window.addEventListener(
      "load",
      () => {
        const current = getRetryStateFromUrl();
        if (current?.retryAttempt === -1) {
          clearRetryStateFromUrl();
        }
      },
      { once: true },
    );
  }

  const wa = globalThis.window.addEventListener.bind(globalThis.window);

  wa(
    "error",
    (event) => {
      const assetUrl = getAssetUrl(event);
      if (isStaticAssetError(event) && isLikely404(assetUrl)) {
        if (shouldIgnoreMessages([assetUrl, event.message])) {
          return;
        }
        event.preventDefault();
        emitEvent({ name: "static-asset-load-failed", url: assetUrl });
        if (options.staticAssets?.autoRecover !== false) {
          handleStaticAssetFailure(assetUrl);
        }
        return;
      }

      if (shouldIgnoreMessages([event.message])) {
        return;
      }

      getLogger()?.capturedError("error", event);

      if (isChunkError(event)) {
        event.preventDefault();
        attemptReload(event.error ?? event);
        return;
      }

      if (shouldForceRetry([event.message])) {
        event.preventDefault();
        attemptReload(event.error ?? event);
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

    if (shouldIgnoreMessages([errorMessage])) {
      return;
    }

    getLogger()?.capturedError("unhandledrejection", event);

    if (isChunkError(event.reason)) {
      event.preventDefault();
      attemptReload(event.reason);
      return;
    }

    if (shouldForceRetry([errorMessage])) {
      event.preventDefault();
      attemptReload(event.reason);
      return;
    }

    const rejectionConfig = options.handleUnhandledRejections;

    if (rejectionConfig?.sendBeacon !== false) {
      const serialized = serializeError(event);
      sendBeacon({
        errorMessage,
        eventName: "unhandledrejection",
        serialized,
        ...getRetryInfoForBeacon(),
      });
    }

    if (rejectionConfig?.retry !== false) {
      event.preventDefault();
      attemptReload(event.reason);
    }
  });

  wa("securitypolicyviolation", (event) => {
    const eventMessage = `${event.violatedDirective}: ${event.blockedURI}`;

    if (shouldIgnoreMessages([eventMessage])) {
      return;
    }

    getLogger()?.capturedError("csp", event.blockedURI, event.violatedDirective);

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

    if (shouldIgnoreMessages([errorMsg])) {
      return;
    }

    getLogger()?.capturedError("vite:preloadError", event);

    event.preventDefault();
    attemptReload((event as any)?.payload ?? event);
  });
};
