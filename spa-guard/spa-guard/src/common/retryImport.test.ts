import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./reload", () => ({
  attemptReload: vi.fn(),
}));

import type { SPAGuardEvent } from "./events/types";

import { subscribe } from "./events/internal";
import { attemptReload } from "./reload";
import { retryImport } from "./retryImport";

describe("retryImport", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

    const promise = retryImport(importFn, [500, 1500], { onRetry });

    await vi.runAllTimersAsync();

    await promise;
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 500);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 1500);
  });

  it("does not call onRetry when first attempt succeeds", async () => {
    const importFn = vi.fn().mockResolvedValue({ default: "module" });
    const onRetry = vi.fn();

    await retryImport(importFn, [1000], { onRetry });

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

    const promise = retryImport(importFn, [100, 200, 300], { onRetry });
    promise.catch(() => {});

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow("chunk error");
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200);
    expect(onRetry).toHaveBeenNthCalledWith(3, 3, 300);
  });

  describe("abort signal cleanup", () => {
    it("removes abort listener after wait resolves normally", async () => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const removeListenerSpy = vi.spyOn(controller.signal, "removeEventListener");

      const importFn = vi
        .fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue({ default: "module" });

      const promise = retryImport(importFn, [100], { signal: controller.signal });

      await vi.runAllTimersAsync();
      await promise;

      expect(removeListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    });
  });

  describe("event emissions", () => {
    it("emits lazy-retry-start before first attempt", async () => {
      const importFn = vi.fn().mockResolvedValue({ default: "module" });
      const events: SPAGuardEvent[] = [];
      const unsub = subscribe((e) => events.push(e));

      await retryImport(importFn, [500]);

      unsub();
      expect(events[0]).toMatchObject({ name: "lazy-retry-start", totalAttempts: 2 });
    });

    it("emits lazy-retry-start with correct totalAttempts", async () => {
      const importFn = vi.fn().mockResolvedValue({ default: "module" });
      const events: SPAGuardEvent[] = [];
      const unsub = subscribe((e) => events.push(e));

      await retryImport(importFn, [100, 200, 300]);

      unsub();
      expect(events[0]).toMatchObject({ name: "lazy-retry-start", totalAttempts: 4 });
    });

    it("does not emit lazy-retry-start when delays is empty", async () => {
      const importFn = vi.fn().mockResolvedValue({ default: "module" });
      const events: SPAGuardEvent[] = [];
      const unsub = subscribe((e) => events.push(e));

      await retryImport(importFn, []);

      unsub();
      expect(events.some((e) => e.name === "lazy-retry-start")).toBe(false);
    });

    it("includes error in lazy-retry-attempt event", async () => {
      vi.useFakeTimers();
      const error = new Error("chunk load failed");
      const importFn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ default: "module" });
      const events: SPAGuardEvent[] = [];
      const unsub = subscribe((e) => events.push(e));

      const promise = retryImport(importFn, [100]);
      await vi.runAllTimersAsync();
      await promise;

      unsub();
      const attemptEvent = events.find((e) => e.name === "lazy-retry-attempt");
      expect(attemptEvent).toMatchObject({
        attempt: 1,
        delay: 100,
        error,
        name: "lazy-retry-attempt",
        totalAttempts: 2,
      });
    });

    it("includes totalTime in lazy-retry-success event", async () => {
      vi.useFakeTimers();
      const error = new Error("chunk load failed");
      const importFn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ default: "module" });
      const events: SPAGuardEvent[] = [];
      const unsub = subscribe((e) => events.push(e));

      const promise = retryImport(importFn, [100]);
      await vi.runAllTimersAsync();
      await promise;

      unsub();
      const successEvent = events.find((e) => e.name === "lazy-retry-success");
      expect(successEvent).toBeDefined();
      expect((successEvent as { totalTime?: number }).totalTime).toBeGreaterThanOrEqual(0);
    });

    it("includes error in lazy-retry-exhausted event", async () => {
      vi.useFakeTimers();
      const error = new Error("chunk load failed");
      const importFn = vi.fn().mockRejectedValue(error);
      const events: SPAGuardEvent[] = [];
      const unsub = subscribe((e) => events.push(e));

      const promise = retryImport(importFn, [100]);
      promise.catch(() => {});
      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow("chunk load failed");

      unsub();
      const exhaustedEvent = events.find((e) => e.name === "lazy-retry-exhausted");
      expect(exhaustedEvent).toMatchObject({
        error,
        name: "lazy-retry-exhausted",
        totalAttempts: 2,
        willReload: false,
      });
    });
  });

  describe("callReloadOnFailure", () => {
    it("calls attemptReload when all attempts fail with a chunk error and callReloadOnFailure is true", async () => {
      vi.useFakeTimers();
      const mockAttemptReload = vi.mocked(attemptReload);
      mockAttemptReload.mockClear();

      const error = new Error("Failed to fetch dynamically imported module");
      const importFn = vi.fn().mockRejectedValue(error);

      const promise = retryImport(importFn, [100], { callReloadOnFailure: true });
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Failed to fetch dynamically imported module");
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
      expect(mockAttemptReload).toHaveBeenCalledWith(error);
    });

    it("does not call attemptReload when callReloadOnFailure is false", async () => {
      vi.useFakeTimers();
      const mockAttemptReload = vi.mocked(attemptReload);
      mockAttemptReload.mockClear();

      const error = new Error("Failed to fetch dynamically imported module");
      const importFn = vi.fn().mockRejectedValue(error);

      const promise = retryImport(importFn, [100], { callReloadOnFailure: false });
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Failed to fetch dynamically imported module");
      expect(mockAttemptReload).not.toHaveBeenCalled();
    });

    it("does not call attemptReload when callReloadOnFailure is undefined", async () => {
      vi.useFakeTimers();
      const mockAttemptReload = vi.mocked(attemptReload);
      mockAttemptReload.mockClear();

      const error = new Error("Failed to fetch dynamically imported module");
      const importFn = vi.fn().mockRejectedValue(error);

      const promise = retryImport(importFn, [100]);
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Failed to fetch dynamically imported module");
      expect(mockAttemptReload).not.toHaveBeenCalled();
    });

    it("does not call attemptReload for non-chunk errors even when callReloadOnFailure is true", async () => {
      const mockAttemptReload = vi.mocked(attemptReload);
      mockAttemptReload.mockClear();

      const error = new Error("SyntaxError: unexpected token");
      const importFn = vi.fn().mockRejectedValue(error);

      await expect(retryImport(importFn, [], { callReloadOnFailure: true })).rejects.toThrow(
        "SyntaxError: unexpected token",
      );
      expect(mockAttemptReload).not.toHaveBeenCalled();
    });

    it("still throws error after calling attemptReload", async () => {
      const mockAttemptReload = vi.mocked(attemptReload);
      mockAttemptReload.mockClear();

      const error = new Error("Failed to fetch dynamically imported module");
      const importFn = vi.fn().mockRejectedValue(error);

      await expect(retryImport(importFn, [], { callReloadOnFailure: true })).rejects.toThrow(
        "Failed to fetch dynamically imported module",
      );
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
    });
  });
});
