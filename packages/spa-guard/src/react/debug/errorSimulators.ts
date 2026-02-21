/**
 * Simulates a chunk load error by rejecting with a message that matches
 * spa-guard's chunk error detection patterns in isChunkError.ts.
 */
export function simulateChunkLoadError(): Promise<never> {
  const error = new Error(
    "Failed to fetch dynamically imported module: /nonexistent-chunk-" + Date.now() + ".js",
  );
  error.name = "ChunkLoadError";
  return Promise.reject(error);
}

/**
 * Returns a promise that throws inside its .finally() handler,
 * producing an unhandled rejection with a chunk-error-like message.
 */
export function simulateFinallyError(): Promise<void> {
  return Promise.resolve().finally(() => {
    throw new Error("Failed to fetch dynamically imported module: /finally-error-chunk.js");
  });
}

/**
 * Simulates a network timeout by rejecting after a configurable delay.
 */
export function simulateNetworkTimeout(delayMs = 3000): Promise<never> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new TypeError("NetworkError: request timed out"));
    }, delayMs);
  });
}

/**
 * Throws a runtime error synchronously. When called inside a React component's
 * render or event handler, this will be caught by a React error boundary.
 */
export function simulateRuntimeError(): never {
  throw new Error("Simulated runtime error from spa-guard debug panel");
}
