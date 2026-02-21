import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isChunkError } from "../../common/isChunkError";
import {
  simulateChunkLoadError,
  simulateFinallyError,
  simulateNetworkTimeout,
  simulateRuntimeError,
} from "./errorSimulators";

describe("simulateChunkLoadError", () => {
  it("rejects with an error", async () => {
    await expect(simulateChunkLoadError()).rejects.toThrow();
  });

  it("rejects with an error recognized by isChunkError", async () => {
    const error = await simulateChunkLoadError().catch((error: unknown) => error);
    expect(isChunkError(error)).toBe(true);
  });

  it("rejects with an Error instance", async () => {
    const error = await simulateChunkLoadError().catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
  });

  it("has name set to ChunkLoadError", async () => {
    const error = await simulateChunkLoadError().catch((error: unknown) => error);
    expect((error as Error).name).toBe("ChunkLoadError");
  });
});

describe("simulateNetworkTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects after the default delay", async () => {
    const promise = simulateNetworkTimeout();

    vi.advanceTimersByTime(3000);

    await expect(promise).rejects.toThrow("NetworkError: request timed out");
  });

  it("rejects with a TypeError", async () => {
    const promise = simulateNetworkTimeout();

    vi.advanceTimersByTime(3000);

    const error = await promise.catch((error: unknown) => error);
    expect(error).toBeInstanceOf(TypeError);
  });

  it("accepts a custom delay", async () => {
    const promise = simulateNetworkTimeout(500);

    // Should not have rejected yet at 499ms
    vi.advanceTimersByTime(499);
    const pending = Promise.race([
      promise.then(
        () => "resolved" as const,
        () => "rejected" as const,
      ),
      Promise.resolve("pending" as const),
    ]);
    expect(await pending).toBe("pending");

    // Should reject at 500ms
    vi.advanceTimersByTime(1);
    await expect(promise).rejects.toThrow();
  });

  it("is not recognized as a chunk error", async () => {
    const promise = simulateNetworkTimeout();
    vi.advanceTimersByTime(3000);

    const error = await promise.catch((error: unknown) => error);
    expect(isChunkError(error)).toBe(false);
  });
});

describe("simulateRuntimeError", () => {
  it("throws synchronously", () => {
    expect(() => simulateRuntimeError()).toThrow();
  });

  it("throws an Error instance", () => {
    expect(() => simulateRuntimeError()).toThrow(Error);
  });

  it("throws with a descriptive message", () => {
    expect(() => simulateRuntimeError()).toThrow(
      "Simulated runtime error from spa-guard debug panel",
    );
  });

  it("is not recognized as a chunk error", () => {
    let caught: unknown;
    try {
      simulateRuntimeError();
    } catch (error) {
      caught = error;
    }
    expect(isChunkError(caught)).toBe(false);
  });
});

describe("simulateFinallyError", () => {
  it("rejects with an error", async () => {
    await expect(simulateFinallyError()).rejects.toThrow();
  });

  it("rejects with an error recognized by isChunkError", async () => {
    const error = await simulateFinallyError().catch((error: unknown) => error);
    expect(isChunkError(error)).toBe(true);
  });

  it("rejects with an Error instance", async () => {
    const error = await simulateFinallyError().catch((error: unknown) => error);
    expect(error).toBeInstanceOf(Error);
  });

  it("includes 'finally' context in the error message", async () => {
    const error = await simulateFinallyError().catch((error: unknown) => error);
    expect((error as Error).message).toContain("finally");
  });
});
