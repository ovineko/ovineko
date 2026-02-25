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
import { triggerRetry } from "../retryOrchestrator";
import { getRetryInfoForBeacon } from "../retryState";
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
        triggerRetry({ error: event.error ?? event, source: "chunk-error" });
        return;
      }

      if (shouldForceRetry([event.message])) {
        event.preventDefault();
        triggerRetry({ error: event.error ?? event, source: "force-retry" });
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
      triggerRetry({ error: event.reason, source: "chunk-error" });
      return;
    }

    if (shouldForceRetry([errorMessage])) {
      event.preventDefault();
      triggerRetry({ error: event.reason, source: "force-retry" });
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
      triggerRetry({ error: event.reason, source: "unhandled-rejection" });
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
    const payload = (event as any)?.payload;
    const errorMsg = payload?.message || (event as any)?.message;

    if (shouldIgnoreMessages([errorMsg])) {
      return;
    }

    getLogger()?.capturedError("vite:preloadError", event);

    event.preventDefault();
    triggerRetry({ error: payload ?? event, source: "vite:preloadError" });
  });
};
