/**
 * Error dispatchers for the debug panel.
 *
 * Unlike the old errorSimulators (which returned promises that callers could catch),
 * these functions return void. Errors are "fire and forget" — they escape to
 * window event listeners (window.error, window.unhandledrejection) where
 * spa-guard's listenInternal() picks them up.
 */

/* eslint-disable sonarjs/void-use -- All dispatchers intentionally use void Promise.reject() to create unhandled rejections */

import { debugSyncErrorEventType } from "../../common/constants";
import { ForceRetryError } from "../../common/errors/ForceRetryError";
import { emitEvent } from "../../common/events/internal";
import { getOptions } from "../../common/options";
import { showFallbackUI } from "../../common/reload";

/**
 * Dispatches an async runtime error via setTimeout.
 * Triggers the window "error" event because the throw happens outside
 * any call stack that could catch it.
 */
export function dispatchAsyncRuntimeError(): void {
  setTimeout(() => {
    throw new Error("Simulated runtime error from spa-guard debug panel");
  }, 0);
}

/**
 * Dispatches an unhandled chunk load error via void Promise.reject().
 * Triggers window "unhandledrejection" with an error matching spa-guard's
 * chunk error detection patterns.
 */
export function dispatchChunkLoadError(): void {
  const error = new Error(
    "Failed to fetch dynamically imported module: /nonexistent-chunk-" + Date.now() + ".js",
  );
  error.name = "ChunkLoadError";
  void Promise.reject(error);
}

/**
 * Dispatches an unhandled chunk error via Promise.finally().
 * The throw inside .finally() with no surrounding catch produces
 * a window "unhandledrejection" event.
 */
export function dispatchFinallyError(): void {
  void Promise.resolve().finally(() => {
    throw new Error("Failed to fetch dynamically imported module: /finally-error-chunk.js");
  });
}

/**
 * Dispatches a ForceRetryError via void Promise.reject().
 * Triggers window "unhandledrejection" with a ForceRetryError whose message
 * contains the FORCE_RETRY_MAGIC prefix, exercising the forceRetry path.
 */
export function dispatchForceRetryError(): void {
  void Promise.reject(new ForceRetryError("Simulated force-retry from spa-guard debug panel"));
}

/**
 * Dispatches an unhandled network timeout error after a delay.
 * Uses setTimeout + void Promise.reject() to trigger window "unhandledrejection".
 */
export function dispatchNetworkTimeout(delayMs = 3000): void {
  setTimeout(() => {
    void Promise.reject(new TypeError("NetworkError: request timed out"));
  }, delayMs);
}

/**
 * Simulates the retry-exhausted state by emitting the "retry-exhausted" event
 * with finalAttempt equal to the configured reloadDelays length, then renders
 * the fallback UI into the DOM.
 */
export function dispatchRetryExhausted(): void {
  const options = getOptions();
  const reloadDelays = options.reloadDelays ?? [1000, 2000, 5000];

  emitEvent({
    finalAttempt: reloadDelays.length,
    name: "retry-exhausted",
    retryId: "",
  });

  showFallbackUI();
}

/**
 * Simulates a static asset 404 by appending a <script> element with a
 * nonexistent hashed URL to document.head. The browser fires an "error"
 * event on the element, which spa-guard's listenInternal() detects via
 * the Resource Timing API-based isLikely404 check.
 */
export function dispatchStaticAsset404(): void {
  const hash = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  const script = document.createElement("script");
  script.src = `/assets/index-${hash}.js`;
  document.head.append(script);
}

/**
 * Dispatches a sync runtime error via CustomEvent.
 * DebugSyncErrorTrigger (a React component) listens for this event,
 * stores the error in state, and throws it during render so that
 * React Error Boundary can catch it.
 */
export function dispatchSyncRuntimeError(): void {
  const error = new Error("Simulated sync runtime error from spa-guard debug panel");
  globalThis.dispatchEvent(new CustomEvent(debugSyncErrorEventType, { detail: { error } }));
}

/**
 * Dispatches a plain unhandled promise rejection via void Promise.reject().
 * This is NOT a chunk error and NOT a ForceRetry — it exercises the
 * handleUnhandledRejections config path for generic rejections.
 */
export function dispatchUnhandledRejection(): void {
  void Promise.reject(
    new Error("Simulated unhandled promise rejection from spa-guard debug panel"),
  );
}
