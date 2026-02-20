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
   * Call attemptReload() after all retry attempts are exhausted.
   * If true, triggers page reload logic after all retries fail.
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
}
