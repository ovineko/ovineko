import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../common/reload", () => ({
  attemptReload: vi.fn(),
}));

vi.mock("../common/events/internal", () => ({
  emitEvent: vi.fn(),
}));

import { attemptReload } from "../common/reload";
import { retryImport } from "../common/retryImport";

/**
 * Helper to create a mock import function with a controllable sequence of results.
 * Each entry in the sequence is either a value (resolves) or an Error (rejects).
 * Once the sequence is exhausted, the last entry is repeated.
 *
 * @example
 * // Fails once, then succeeds
 * const mockImport = createMockImport([new Error("chunk error"), { default: MyComponent }]);
 *
 * @example
 * // Always fails
 * const mockImport = createMockImport([new Error("chunk error")]);
 */
const createMockImport = <T>(sequence: Array<Error | T>): (() => Promise<T>) => {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const item = sequence[callIndex] ?? sequence.at(-1);
    callIndex++;
    if (item instanceof Error) {
      return Promise.reject(item);
    }
    return Promise.resolve(item as T);
  });
};

describe("retryImport (react-lazy)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(attemptReload).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves immediately on the first successful attempt", async () => {
    const mockImport = createMockImport([{ default: "module" }]);

    const result = await retryImport(mockImport, []);

    expect(result).toEqual({ default: "module" });
    expect(mockImport).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and resolves on a subsequent attempt", async () => {
    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImport = createMockImport([chunkError, { default: "module" }]);

    const promise = retryImport(mockImport, [100]);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ default: "module" });
    expect(mockImport).toHaveBeenCalledTimes(2);
  });

  it("rejects with the last error after all attempts are exhausted", async () => {
    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImport = createMockImport([chunkError]);

    const promise = retryImport(mockImport, [100, 200]);
    promise.catch(() => {});
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Failed to fetch dynamically imported module");
    expect(mockImport).toHaveBeenCalledTimes(3);
  });

  it("calls attemptReload when callReloadOnFailure is true and error is a chunk error", async () => {
    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImport = createMockImport([chunkError]);

    const promise = retryImport(mockImport, [100], { callReloadOnFailure: true });
    promise.catch(() => {});
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect(attemptReload).toHaveBeenCalledTimes(1);
    expect(attemptReload).toHaveBeenCalledWith(chunkError);
  });

  it("does not call attemptReload when callReloadOnFailure is false", async () => {
    const chunkError = new Error("Failed to fetch dynamically imported module");
    const mockImport = createMockImport([chunkError]);

    const promise = retryImport(mockImport, [100], { callReloadOnFailure: false });
    promise.catch(() => {});
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect(attemptReload).not.toHaveBeenCalled();
  });

  it("does not call attemptReload for non-chunk errors even when callReloadOnFailure is true", async () => {
    const nonChunkError = new Error("SyntaxError: unexpected token");
    const mockImport = createMockImport([nonChunkError]);

    await expect(retryImport(mockImport, [], { callReloadOnFailure: true })).rejects.toThrow(
      "SyntaxError: unexpected token",
    );
    expect(attemptReload).not.toHaveBeenCalled();
  });

  it("invokes onRetry callback with correct attempt number and delay", async () => {
    const chunkError = new Error("chunk error");
    const mockImport = createMockImport([chunkError, chunkError, { default: "ok" }]);
    const onRetry = vi.fn();

    const promise = retryImport(mockImport, [500, 1500], { onRetry });
    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 500);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 1500);
  });

  it("applies delays from the array in the correct order", async () => {
    const chunkError = new Error("chunk error");
    const mockImport = createMockImport([chunkError]);
    const onRetry = vi.fn();

    const promise = retryImport(mockImport, [100, 200, 300], { onRetry });
    promise.catch(() => {});
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200);
    expect(onRetry).toHaveBeenNthCalledWith(3, 3, 300);
  });
});
