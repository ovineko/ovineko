import { type ComponentType, lazy, type LazyExoticComponent } from "react";

import { getOptions } from "../common/options";
import { retryImport } from "../common/retryImport";

/**
 * Per-import options for lazyWithRetry that override global lazyRetry options.
 */
export interface LazyRetryOptions {
  /**
   * Call attemptReload() after all retry attempts are exhausted.
   * If true, triggers page reload logic after all retries fail.
   * If false, only throws the error to the error boundary without reload.
   * Overrides the global `window.__SPA_GUARD_OPTIONS__.lazyRetry.callReloadOnFailure`.
   */
  callReloadOnFailure?: boolean;

  /**
   * Array of delays in milliseconds for retry attempts.
   * Each element represents one retry attempt with the given delay.
   * Overrides the global `window.__SPA_GUARD_OPTIONS__.lazyRetry.retryDelays`.
   *
   * @example [500, 1500, 3000] // 3 attempts: 500ms, 1.5s, 3s
   */
  retryDelays?: number[];
}

/**
 * Creates a lazy-loaded React component with automatic retry on chunk load failures.
 *
 * On import failure, retries with configurable delays before falling back to
 * `attemptReload()` for a full page reload.
 *
 * @param importFn - Function that performs the dynamic import
 * @param options - Per-import options that override global lazyRetry options
 * @returns A lazy React component with retry logic
 *
 * @example
 * // Basic usage with global options
 * const LazyHome = lazyWithRetry(() => import('./pages/Home'));
 *
 * @example
 * // Override retry delays for a critical component
 * const LazyCheckout = lazyWithRetry(
 *   () => import('./pages/Checkout'),
 *   { retryDelays: [500, 1000, 2000, 4000] }
 * );
 *
 * @example
 * // Disable page reload for a non-critical component
 * const LazyWidget = lazyWithRetry(
 *   () => import('./widgets/Optional'),
 *   { retryDelays: [1000], callReloadOnFailure: false }
 * );
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: LazyRetryOptions,
): LazyExoticComponent<T> => {
  return lazy(() => {
    const globalLazyRetry = getOptions().lazyRetry ?? {};

    const retryDelays = options?.retryDelays ?? globalLazyRetry.retryDelays ?? [1000, 2000];
    const callReloadOnFailure =
      options?.callReloadOnFailure ?? globalLazyRetry.callReloadOnFailure ?? true;

    return retryImport(importFn, retryDelays, undefined, callReloadOnFailure);
  });
};
