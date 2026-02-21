import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isChunkError } from "../../common/isChunkError";
import {
  dispatchChunkLoadError,
  dispatchFinallyError,
  dispatchNetworkTimeout,
  dispatchRuntimeError,
} from "./errorDispatchers";

/**
 * Helper: capture the next unhandled rejection via process.on("unhandledRejection").
 * In Node/happy-dom, void Promise.reject() fires on process, not window.
 */
function captureUnhandledRejection(): Promise<unknown> {
  return new Promise((resolve) => {
    const handler = (reason: unknown) => {
      process.removeListener("unhandledRejection", handler);
      resolve(reason);
    };
    process.on("unhandledRejection", handler);
  });
}

describe("dispatchChunkLoadError", () => {
  it("returns void (not a promise)", () => {
    const capture = captureUnhandledRejection();
    const result = dispatchChunkLoadError();
    expect(result).toBeUndefined();
    return capture;
  });

  it("triggers an unhandled rejection with an Error instance", async () => {
    const capture = captureUnhandledRejection();
    dispatchChunkLoadError();
    const error = await capture;
    expect(error).toBeInstanceOf(Error);
  });

  it("dispatches an error recognized by isChunkError", async () => {
    const capture = captureUnhandledRejection();
    dispatchChunkLoadError();
    const error = await capture;
    expect(isChunkError(error)).toBe(true);
  });

  it("dispatches an error with name ChunkLoadError", async () => {
    const capture = captureUnhandledRejection();
    dispatchChunkLoadError();
    const error = await capture;
    expect((error as Error).name).toBe("ChunkLoadError");
  });
});

describe("dispatchNetworkTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns void", () => {
    const result = dispatchNetworkTimeout();
    expect(result).toBeUndefined();
    // Clean up: advance timers and consume rejection
    const capture = captureUnhandledRejection();
    vi.advanceTimersByTime(3000);
    return capture;
  });

  it("dispatches a TypeError after the default delay", async () => {
    const capture = captureUnhandledRejection();
    dispatchNetworkTimeout();
    vi.advanceTimersByTime(3000);
    const error = await capture;
    expect(error).toBeInstanceOf(TypeError);
    expect((error as TypeError).message).toBe("NetworkError: request timed out");
  });

  it("accepts a custom delay", async () => {
    const capture = captureUnhandledRejection();
    dispatchNetworkTimeout(500);

    // Not fired yet at 499ms
    vi.advanceTimersByTime(499);
    const pending = Promise.race([
      capture.then(() => "fired" as const),
      Promise.resolve("pending" as const),
    ]);
    expect(await pending).toBe("pending");

    // Fires at 500ms
    vi.advanceTimersByTime(1);
    const error = await capture;
    expect(error).toBeInstanceOf(TypeError);
  });

  it("dispatches an error not recognized as a chunk error", async () => {
    const capture = captureUnhandledRejection();
    dispatchNetworkTimeout();
    vi.advanceTimersByTime(3000);
    const error = await capture;
    expect(isChunkError(error)).toBe(false);
  });
});

describe("dispatchRuntimeError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns void", () => {
    const result = dispatchRuntimeError();
    expect(result).toBeUndefined();
    // Pending fake timer is discarded by vi.useRealTimers() in afterEach
  });

  it("schedules a throw via setTimeout", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchRuntimeError();
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 0);
    spy.mockRestore();
  });

  it("the scheduled callback throws an Error with descriptive message", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchRuntimeError();
    const callback = spy.mock.calls.at(-1)[0] as () => void;
    spy.mockRestore();

    expect(() => callback()).toThrow("Simulated runtime error from spa-guard debug panel");
  });

  it("the thrown error is an Error instance", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchRuntimeError();
    const callback = spy.mock.calls.at(-1)[0] as () => void;
    spy.mockRestore();

    expect(() => callback()).toThrow(Error);
  });

  it("dispatches an error not recognized as a chunk error", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchRuntimeError();
    const callback = spy.mock.calls.at(-1)[0] as () => void;
    spy.mockRestore();

    let caught: unknown;
    try {
      callback();
    } catch (error) {
      caught = error;
    }
    expect(isChunkError(caught)).toBe(false);
  });
});

describe("dispatchFinallyError", () => {
  it("returns void", () => {
    const capture = captureUnhandledRejection();
    const result = dispatchFinallyError();
    expect(result).toBeUndefined();
    return capture;
  });

  it("triggers an unhandled rejection with an Error instance", async () => {
    const capture = captureUnhandledRejection();
    dispatchFinallyError();
    const error = await capture;
    expect(error).toBeInstanceOf(Error);
  });

  it("dispatches an error recognized by isChunkError", async () => {
    const capture = captureUnhandledRejection();
    dispatchFinallyError();
    const error = await capture;
    expect(isChunkError(error)).toBe(true);
  });

  it("includes 'finally' context in the error message", async () => {
    const capture = captureUnhandledRejection();
    dispatchFinallyError();
    const error = await capture;
    expect((error as Error).message).toContain("finally");
  });
});
