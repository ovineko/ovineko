import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debugSyncErrorEventType } from "../../common/constants";
import { FORCE_RETRY_MAGIC, ForceRetryError } from "../../common/errors/ForceRetryError";
import { isChunkError } from "../../common/isChunkError";
import { shouldForceRetry } from "../../common/shouldIgnore";
import {
  dispatchAsyncRuntimeError,
  dispatchChunkLoadError,
  dispatchFinallyError,
  dispatchForceRetryError,
  dispatchNetworkTimeout,
  dispatchSyncRuntimeError,
  dispatchUnhandledRejection,
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

describe("dispatchAsyncRuntimeError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns void", () => {
    const result = dispatchAsyncRuntimeError();
    expect(result).toBeUndefined();
    // Pending fake timer is discarded by vi.useRealTimers() in afterEach
  });

  it("schedules a throw via setTimeout", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchAsyncRuntimeError();
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 0);
    spy.mockRestore();
  });

  it("the scheduled callback throws an Error with descriptive message", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchAsyncRuntimeError();
    const callback = spy.mock.calls.at(-1)[0] as () => void;
    spy.mockRestore();

    expect(() => callback()).toThrow("Simulated runtime error from spa-guard debug panel");
  });

  it("the thrown error is an Error instance", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchAsyncRuntimeError();
    const callback = spy.mock.calls.at(-1)[0] as () => void;
    spy.mockRestore();

    expect(() => callback()).toThrow(Error);
  });

  it("dispatches an error not recognized as a chunk error", () => {
    const spy = vi.spyOn(globalThis, "setTimeout");
    dispatchAsyncRuntimeError();
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

describe("dispatchSyncRuntimeError", () => {
  const handlers: Array<(e: Event) => void> = [];

  afterEach(() => {
    for (const h of handlers) {
      globalThis.removeEventListener(debugSyncErrorEventType, h);
    }
    handlers.length = 0;
  });

  it("returns void", () => {
    const result = dispatchSyncRuntimeError();
    expect(result).toBeUndefined();
  });

  it("fires a CustomEvent on window with the correct type", () => {
    const spy = vi.fn();
    handlers.push(spy);
    globalThis.addEventListener(debugSyncErrorEventType, spy);
    dispatchSyncRuntimeError();
    expect(spy).toHaveBeenCalledOnce();
  });

  it("passes an Error in event.detail.error", () => {
    let receivedDetail: undefined | { error: unknown };
    const handler = (e: Event) => {
      receivedDetail = (e as CustomEvent).detail as { error: unknown };
    };
    handlers.push(handler);
    globalThis.addEventListener(debugSyncErrorEventType, handler);
    dispatchSyncRuntimeError();

    expect(receivedDetail).toBeDefined();
    expect(receivedDetail!.error).toBeInstanceOf(Error);
  });

  it("includes a descriptive message in the error", () => {
    let receivedError: Error | undefined;
    const handler = (e: Event) => {
      receivedError = (e as CustomEvent).detail.error as Error;
    };
    handlers.push(handler);
    globalThis.addEventListener(debugSyncErrorEventType, handler);
    dispatchSyncRuntimeError();

    expect(receivedError!.message).toBe("Simulated sync runtime error from spa-guard debug panel");
  });

  it("dispatches an error not recognized as a chunk error", () => {
    let receivedError: unknown;
    const handler = (e: Event) => {
      receivedError = (e as CustomEvent).detail.error as unknown;
    };
    handlers.push(handler);
    globalThis.addEventListener(debugSyncErrorEventType, handler);
    dispatchSyncRuntimeError();

    expect(isChunkError(receivedError)).toBe(false);
  });
});

describe("dispatchForceRetryError", () => {
  it("returns void (not a promise)", () => {
    const capture = captureUnhandledRejection();
    const result = dispatchForceRetryError();
    expect(result).toBeUndefined();
    return capture;
  });

  it("triggers an unhandled rejection with a ForceRetryError instance", async () => {
    const capture = captureUnhandledRejection();
    dispatchForceRetryError();
    const error = await capture;
    expect(error).toBeInstanceOf(ForceRetryError);
  });

  it("dispatches an error whose message contains FORCE_RETRY_MAGIC", async () => {
    const capture = captureUnhandledRejection();
    dispatchForceRetryError();
    const error = await capture;
    expect((error as Error).message).toContain(FORCE_RETRY_MAGIC);
  });

  it("shouldForceRetry returns true for its message", async () => {
    const capture = captureUnhandledRejection();
    dispatchForceRetryError();
    const error = await capture;
    expect(shouldForceRetry([(error as Error).message])).toBe(true);
  });

  it("dispatches an error not recognized as a chunk error", async () => {
    const capture = captureUnhandledRejection();
    dispatchForceRetryError();
    const error = await capture;
    expect(isChunkError(error)).toBe(false);
  });
});

describe("dispatchUnhandledRejection", () => {
  it("returns void (not a promise)", () => {
    const capture = captureUnhandledRejection();
    const result = dispatchUnhandledRejection();
    expect(result).toBeUndefined();
    return capture;
  });

  it("triggers an unhandled rejection with a plain Error instance", async () => {
    const capture = captureUnhandledRejection();
    dispatchUnhandledRejection();
    const error = await capture;
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ForceRetryError);
  });

  it("dispatches an error not recognized by isChunkError", async () => {
    const capture = captureUnhandledRejection();
    dispatchUnhandledRejection();
    const error = await capture;
    expect(isChunkError(error)).toBe(false);
  });

  it("shouldForceRetry returns false for its message", async () => {
    const capture = captureUnhandledRejection();
    dispatchUnhandledRejection();
    const error = await capture;
    expect(shouldForceRetry([(error as Error).message])).toBe(false);
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
