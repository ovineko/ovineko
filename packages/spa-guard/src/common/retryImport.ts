const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Retries an import function with configurable delays between attempts.
 *
 * @param importFn - The function that performs the dynamic import
 * @param delays - Array of delays in milliseconds. Each entry represents one retry attempt.
 * @param onRetry - Optional callback called before each retry attempt
 * @returns Promise that resolves with the import result or rejects after all attempts are exhausted
 *
 * @example
 * retryImport(() => import('./MyModule'), [1000, 2000])
 * retryImport(() => import('./MyModule'), [500, 1500], (attempt, delayMs) => {
 *   console.log(`Retry attempt ${attempt} after ${delayMs}ms`);
 * })
 */
export const retryImport = async <T>(
  importFn: () => Promise<T>,
  delays: number[],
  onRetry?: (attempt: number, delay: number) => void,
): Promise<T> => {
  let lastError: Error = new Error("Import failed after all retry attempts");

  const totalAttempts = delays.length + 1;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const currentDelay = delays[attempt];
      if (currentDelay === undefined) {
        break;
      }

      onRetry?.(attempt + 1, currentDelay);
      await wait(currentDelay);
    }
  }

  throw lastError;
};
