import { describe, expect, it, vi } from "vitest";

import { retryImport } from "./retryImport";

describe("retryImport", () => {
  it("resolves immediately on first successful attempt", async () => {
    const importFn = vi.fn().mockResolvedValue({ default: "module" });

    const result = await retryImport(importFn, [1000, 2000]);

    expect(result).toEqual({ default: "module" });
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and resolves on second attempt", async () => {
    vi.useFakeTimers();
    const error = new Error("Failed to fetch dynamically imported module");
    const importFn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue({ default: "module" });

    const promise = retryImport(importFn, [500]);

    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toEqual({ default: "module" });
    expect(importFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("rejects with last error after all attempts exhausted", async () => {
    vi.useFakeTimers();
    const error = new Error("Failed to fetch dynamically imported module");
    const importFn = vi.fn().mockRejectedValue(error);

    const promise = retryImport(importFn, [500, 1000]);
    promise.catch(() => {});

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Failed to fetch dynamically imported module");
    expect(importFn).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("calls onRetry with correct attempt number and delay", async () => {
    vi.useFakeTimers();
    const error = new Error("chunk error");
    const importFn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue({ default: "module" });
    const onRetry = vi.fn();

    const promise = retryImport(importFn, [500, 1500], onRetry);

    await vi.runAllTimersAsync();

    await promise;
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 500);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 1500);

    vi.useRealTimers();
  });

  it("does not call onRetry when first attempt succeeds", async () => {
    const importFn = vi.fn().mockResolvedValue({ default: "module" });
    const onRetry = vi.fn();

    await retryImport(importFn, [1000], onRetry);

    expect(onRetry).not.toHaveBeenCalled();
  });

  it("resolves immediately with empty delays array on first success", async () => {
    const importFn = vi.fn().mockResolvedValue({ default: "module" });

    const result = await retryImport(importFn, []);

    expect(result).toEqual({ default: "module" });
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it("rejects immediately with empty delays array on failure", async () => {
    const error = new Error("chunk error");
    const importFn = vi.fn().mockRejectedValue(error);

    await expect(retryImport(importFn, [])).rejects.toThrow("chunk error");
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it("applies delays in correct order from the delays array", async () => {
    vi.useFakeTimers();
    const error = new Error("chunk error");
    const importFn = vi.fn().mockRejectedValue(error);
    const onRetry = vi.fn();

    const promise = retryImport(importFn, [100, 200, 300], onRetry);
    promise.catch(() => {});

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("chunk error");
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200);
    expect(onRetry).toHaveBeenNthCalledWith(3, 3, 300);

    vi.useRealTimers();
  });
});
