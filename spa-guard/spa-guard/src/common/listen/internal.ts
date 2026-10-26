import type { Logger } from "../logger";

import {
  clampBeaconField,
  clampSerializedBeaconField,
  MAX_STRING_FIELD_LENGTH,
} from "../../schema/parse";
import { describeError } from "../describeError";
import {
  emitEvent,
  getLogger,
  isInitialized,
  markInitialized,
  setLogger,
} from "../events/internal";
import { isChunkError } from "../isChunkError";
import { isCodeResource } from "../isCodeResource";
import {
  getAssetUrl,
  getResourceTimingInfo,
  getResourceUrl,
  isLikely404,
  isStaticAssetError,
} from "../isStaticAssetError";
import { getOptions } from "../options";
import { getPageUrl } from "../pageUrl";
import { triggerRetry } from "../retryOrchestrator";
import { getRetryInfoForBeacon } from "../retryState";
import { sendBeacon } from "../sendBeacon";
import { shouldForceRetry, shouldIgnoreMessages } from "../shouldIgnore";
import { handleStaticAssetFailure } from "../staticAssetRecovery";

const isErrorEvent = (event: Event): boolean =>
  typeof ErrorEvent !== "undefined" && event instanceof ErrorEvent;

const NO_BYTES_SUFFIX = " (resource status unknown; no bytes delivered)";

const noBytesContextFrom = (pageUrl: string | undefined): string => {
  const room = MAX_STRING_FIELD_LENGTH - NO_BYTES_SUFFIX.length;
  return `${(pageUrl ?? "").slice(0, room)}${NO_BYTES_SUFFIX}`;
};

export const listenInternal = (serializeError: (error: unknown) => string, logger?: Logger) => {
  if (globalThis.window === undefined) {
    return;
  }

  if (isInitialized()) {
    return;
  }

  if (logger) {
    setLogger(logger);
  }

  markInitialized();

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
        const resourceReport = getOptions().resources?.report ?? "code";
        const shouldReport =
          resourceReport !== "none" && (resourceReport !== "code" || isCodeResource(event.target));
        if (shouldReport) {
          const timing = getResourceTimingInfo(assetUrl);
          const pageUrl = getPageUrl();
          const noBytesContext = noBytesContextFrom(pageUrl);
          sendBeacon({
            ...(pageUrl !== undefined && { errorContext: clampBeaconField(pageUrl) }),
            errorMessage: clampBeaconField(`Failed to load ${assetUrl}`),
            ...(timing.responseStatus !== undefined && { httpStatus: timing.responseStatus }),
            ...(timing.noBytesDelivered && timing.responseStatus === undefined
              ? { errorContext: noBytesContext }
              : {}),
            errorType: "asset",
            eventName: "resource-error",
            serialized: clampSerializedBeaconField(serializeError(event)),
            url: clampBeaconField(assetUrl),
            ...getRetryInfoForBeacon(),
          });
        }
        emitEvent({ name: "static-asset-load-failed", url: assetUrl });
        if (getOptions().staticAssets?.autoRecover !== false) {
          handleStaticAssetFailure(assetUrl);
        }
        return;
      }

      const resource = !isErrorEvent(event) && event.target instanceof Element;
      const resourceUrl = resource ? getResourceUrl(event) : "";
      const resourceTag = resource ? event.target.tagName.toLowerCase() : "";
      const resourceMessage = resource
        ? clampBeaconField(
            `Failed to load ${event.target.tagName}${resourceUrl ? `: ${resourceUrl}` : ""}`,
          )
        : undefined;

      if (shouldIgnoreMessages(resource ? [resourceUrl, resourceMessage] : [event.message])) {
        return;
      }

      const resourceReport = getOptions().resources?.report ?? "code";
      if (
        resource &&
        (resourceReport === "none" || (resourceReport === "code" && !isCodeResource(event.target)))
      ) {
        return;
      }
      const timing = resource ? getResourceTimingInfo(resourceUrl) : undefined;

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
      const pageUrl = getPageUrl();
      const noBytesContext = noBytesContextFrom(pageUrl);
      sendBeacon({
        ...(resourceMessage
          ? { errorMessage: resourceMessage }
          : {
              errorMessage:
                typeof event.message === "string" ? clampBeaconField(event.message) : event.message,
            }),
        ...(resource && { errorType: resourceTag, url: clampBeaconField(resourceUrl) }),
        ...(resource && pageUrl !== undefined && { errorContext: clampBeaconField(pageUrl) }),
        ...(timing?.responseStatus !== undefined && { httpStatus: timing.responseStatus }),
        ...(timing?.noBytesDelivered && timing.responseStatus === undefined
          ? { errorContext: noBytesContext }
          : {}),
        eventName: resource ? "resource-error" : "error",
        serialized: clampSerializedBeaconField(serialized),
        ...getRetryInfoForBeacon(),
      });
    },
    true,
  );

  wa("unhandledrejection", (event) => {
    let stringifiedReason: string | undefined;
    try {
      stringifiedReason = String(event.reason);
    } catch {}
    let rawErrorMessage = stringifiedReason;
    if (event.reason instanceof Error) {
      try {
        rawErrorMessage = event.reason.message;
      } catch {}
    }
    const matchingMessages =
      rawErrorMessage === stringifiedReason
        ? [rawErrorMessage]
        : [rawErrorMessage, stringifiedReason];

    if (shouldIgnoreMessages(matchingMessages)) {
      return;
    }

    getLogger()?.capturedError("unhandledrejection", event);

    if (isChunkError(event.reason)) {
      event.preventDefault();
      triggerRetry({ error: event.reason, source: "chunk-error" });
      return;
    }

    if (shouldForceRetry(matchingMessages)) {
      event.preventDefault();
      triggerRetry({ error: event.reason, source: "force-retry" });
      return;
    }

    const rejectionConfig = getOptions().handleUnhandledRejections;
    const errorMessage = describeError(event.reason);

    if (rejectionConfig?.sendBeacon !== false) {
      const serialized = serializeError(event);
      sendBeacon({
        errorMessage,
        eventName: "unhandledrejection",
        serialized: clampSerializedBeaconField(serialized),
        ...getRetryInfoForBeacon(),
      });
    }

    if (rejectionConfig?.retry !== false) {
      event.preventDefault();
      triggerRetry({ error: event.reason, source: "unhandled-rejection" });
    }
  });

  wa("securitypolicyviolation", (event) => {
    const eventMessage = clampBeaconField(`${event.violatedDirective}: ${event.blockedURI}`);

    if (shouldIgnoreMessages([eventMessage])) {
      return;
    }

    getLogger()?.capturedError("csp", event.blockedURI, event.violatedDirective);

    const serialized = serializeError(event);
    sendBeacon({
      eventMessage,
      eventName: "securitypolicyviolation",
      serialized: clampSerializedBeaconField(serialized),
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
