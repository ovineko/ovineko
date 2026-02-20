import { emitEvent } from "./events/internal";
import { isChunkError } from "./isChunkError";
import { attemptReload } from "./reload";

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

/**
 * Options for configuring the retry behaviour of {@link retryImport}.
 */
export interface RetryImportOptions {
  /**
   * If true and all retries fail with a chunk error, calls attemptReload before rethrowing.
   * @default false
   */
  callReloadOnFailure?: boolean;
  /**
   * Optional callback invoked before each retry attempt.
   * Useful for logging or analytics.
   *
   * @param attempt - The 1-based attempt number (1 = first retry)
   * @param delay - The delay in milliseconds before this retry attempt
   *
   * @example
   * onRetry: (attempt, delay) => console.log(`Retry ${attempt} after ${delay}ms`)
   */
  onRetry?: (attempt: number, delay: number) => void;
  /**
   * AbortSignal to cancel pending retries and clear timers.
   * When aborted, any in-progress wait is cancelled immediately (preventing memory leaks),
   * and the retryImport promise rejects with an AbortError.
   * Useful when the caller no longer needs the import result (e.g. component unmounted).
   */
  signal?: AbortSignal;
}

/**
 * Retries an import function with configurable delays between attempts.
 *
 * @param importFn - The function that performs the dynamic import
 * @param delays - Array of delays in milliseconds. Each entry represents one retry attempt.
 * @param options - Optional configuration for retry behaviour
 * @returns Promise that resolves with the import result or rejects after all attempts are exhausted
 *
 * @example
 * retryImport(() => import('./MyModule'), [1000, 2000])
 * retryImport(() => import('./MyModule'), [500, 1500], {
 *   onRetry: (attempt, delayMs) => console.log(`Retry ${attempt} after ${delayMs}ms`),
 * })
 */
export const retryImport = async <T>(
  importFn: () => Promise<T>,
  delays: number[],
  options?: RetryImportOptions,
): Promise<T> => {
  const { callReloadOnFailure, onRetry, signal } = options ?? {};
  let lastError: Error = new Error("Import failed after all retry attempts");

  const totalAttempts = delays.length + 1;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }

    try {
      const result = await importFn();
      if (attempt > 0) {
        emitEvent({ attempt: attempt + 1, name: "lazy-retry-success" });
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const currentDelay = delays[attempt];
      if (currentDelay === undefined) {
        break;
      }

      onRetry?.(attempt + 1, currentDelay);
      emitEvent({
        attempt: attempt + 1,
        delay: currentDelay,
        name: "lazy-retry-attempt",
        totalAttempts,
      });
      await wait(currentDelay, signal);
    }
  }

  const willReload = callReloadOnFailure === true && isChunkError(lastError);
  emitEvent({ name: "lazy-retry-exhausted", totalAttempts, willReload });

  if (willReload) {
    attemptReload(lastError);
  }

  throw lastError;
};
