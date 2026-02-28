// Internal exports for sibling packages. Not part of the public API.
// This module is consumed by @ovineko/spa-guard-react, -react-router, -fastify, -node, -vite.

export { debugSyncErrorEventType } from "./common/constants";
export {
  disableDefaultRetry,
  emitEvent,
  enableDefaultRetry,
  isDefaultRetryEnabled,
  subscribe,
} from "./common/events/internal";
export type { SPAGuardEvent, SPAGuardEventChunkError, UnsubscribeFn } from "./common/events/types";
export { handleErrorWithSpaGuard } from "./common/handleErrorWithSpaGuard";
export type { ErrorInfoLike, HandleErrorOptions } from "./common/handleErrorWithSpaGuard";
export { defaultErrorFallbackHtml, defaultLoadingFallbackHtml } from "./common/html.generated";
export { applyI18n, getI18n } from "./common/i18n";
export { isChunkError } from "./common/isChunkError";
export { listenInternal } from "./common/listen/internal";
export { logMessage } from "./common/log";
export { createLogger } from "./common/logger";
export { getOptions, optionsWindowKey } from "./common/options";
export type { Options } from "./common/options";
export { extractVersionFromHtml } from "./common/parseVersion";
export { retryImport } from "./common/retryImport";
export {
  getRetrySnapshot,
  markRetryHealthyBoot,
  resetRetryOrchestratorForTests,
  triggerRetry,
} from "./common/retryOrchestrator";
export type {
  RetryPhase,
  RetrySnapshot,
  TriggerInput,
  TriggerResult,
} from "./common/retryOrchestrator";
export { serializeError } from "./common/serializeError";
export { defaultSpinnerSvg, sanitizeCssValue, SPINNER_ID } from "./common/spinner";
export {
  dispatchAsyncRuntimeError,
  dispatchChunkLoadError,
  dispatchFinallyError,
  dispatchForceRetryError,
  dispatchNetworkTimeout,
  dispatchSyncRuntimeError,
  dispatchUnhandledRejection,
} from "./runtime/debug/errorDispatchers";
