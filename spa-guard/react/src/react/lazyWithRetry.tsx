import { type ComponentType, lazy, type LazyExoticComponent } from "react";

import { getOptions, retryImport } from "@ovineko/spa-guard/_internal";

import type { LazyRetryOptions } from "./types";

export type { LazyRetryOptions } from "./types";

/**
 * Creates a lazy-loaded React component with automatic retry on chunk load failures.
 *
 * On import failure, retries with configurable delays before falling back to
 * `triggerRetry()` for a full page reload.
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
    const signal = options?.signal;

    return retryImport(importFn, retryDelays, { callReloadOnFailure, signal });
  });
};
