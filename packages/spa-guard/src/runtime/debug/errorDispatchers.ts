/**
 * Error dispatchers for the debug panel.
 *
 * Unlike the old errorSimulators (which returned promises that callers could catch),
 * these functions return void. Errors are "fire and forget" — they escape to
 * window event listeners (window.error, window.unhandledrejection) where
 * spa-guard's listenInternal() picks them up.
 */

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
  // eslint-disable-next-line sonarjs/void-use -- Intentional: creates unhandled rejection for spa-guard to catch
  void Promise.reject(error);
}

/**
 * Dispatches an unhandled chunk error via Promise.finally().
 * The throw inside .finally() with no surrounding catch produces
 * a window "unhandledrejection" event.
 */
export function dispatchFinallyError(): void {
  // eslint-disable-next-line sonarjs/void-use -- Intentional: creates unhandled rejection for spa-guard to catch
  void Promise.resolve().finally(() => {
    throw new Error("Failed to fetch dynamically imported module: /finally-error-chunk.js");
  });
}

/**
 * Dispatches an unhandled network timeout error after a delay.
 * Uses setTimeout + void Promise.reject() to trigger window "unhandledrejection".
 */
export function dispatchNetworkTimeout(delayMs = 3000): void {
  setTimeout(() => {
    // eslint-disable-next-line sonarjs/void-use -- Intentional: creates unhandled rejection for spa-guard to catch
    void Promise.reject(new TypeError("NetworkError: request timed out"));
  }, delayMs);
}

/**
 * Dispatches a synchronous runtime error via setTimeout.
 * Triggers the window "error" event because the throw happens outside
 * any call stack that could catch it.
 */
export function dispatchRuntimeError(): void {
  setTimeout(() => {
    throw new Error("Simulated runtime error from spa-guard debug panel");
  }, 0);
}
