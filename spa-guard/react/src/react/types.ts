/**
 * Per-import options for lazyWithRetry that override global lazyRetry options.
 *
 * @example
 * // Override retry delays for a critical component
 * const LazyCheckout = lazyWithRetry(
 *   () => import('./pages/Checkout'),
 *   { retryDelays: [500, 1000, 2000, 4000] } satisfies LazyRetryOptions
 * );
 */
export interface LazyRetryOptions {
  /**
   * If true, triggers a full page reload via triggerRetry() after all retry attempts are exhausted.
   * If false, only throws the error to the error boundary without reload.
   * Overrides the global `window.__SPA_GUARD_OPTIONS__.lazyRetry.callReloadOnFailure`.
   *
   * @default true (inherited from global options)
   */
  callReloadOnFailure?: boolean;

  /**
   * Array of delays in milliseconds for retry attempts.
   * Each element represents one retry attempt with the given delay.
   * The number of elements determines the number of retry attempts.
   * Overrides the global `window.__SPA_GUARD_OPTIONS__.lazyRetry.retryDelays`.
   *
   * @default [1000, 2000] (inherited from global options)
   * @example [500, 1500, 3000] // 3 attempts: 500ms, 1.5s, 3s
   */
  retryDelays?: number[];

  /**
   * AbortSignal to cancel pending retry delays between import attempts.
   * When the signal fires, any pending setTimeout between retries is cleared
   * and the import promise rejects with an AbortError.
   *
   * Note: cancels only the wait periods between retry attempts, not an in-flight
   * dynamic import (JavaScript does not support cancelling in-flight module fetches).
   * Most useful when calling `retryImport` directly rather than through `lazyWithRetry`,
   * since `lazyWithRetry` captures the signal at module scope (not per component instance).
   */
  signal?: AbortSignal;
}
