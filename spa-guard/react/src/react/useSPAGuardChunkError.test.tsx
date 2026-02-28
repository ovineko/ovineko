import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ovineko/spa-guard/_internal", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    subscribe: vi.fn(),
  };
});

import type { SPAGuardEvent, SubscribeFn } from "@ovineko/spa-guard/_internal";

import { subscribe } from "@ovineko/spa-guard/_internal";

import { useSPAGuardChunkError } from "./useSPAGuardChunkError";

const mockSubscribe = vi.mocked(subscribe);

describe("useSPAGuardChunkError", () => {
  let capturedSubscriber: null | SubscribeFn = null;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    capturedSubscriber = null;
    mockUnsubscribe.mockReset();
    mockSubscribe.mockImplementation((cb) => {
      capturedSubscriber = cb;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null initially", () => {
    const { result } = renderHook(() => useSPAGuardChunkError());

    expect(result.current).toBeNull();
  });

  it("returns chunk-error event when one is emitted", () => {
    const { result } = renderHook(() => useSPAGuardChunkError());

    const error = new Error("chunk load failed");
    const event: SPAGuardEvent = { error, isRetrying: true, name: "chunk-error" };

    act(() => {
      capturedSubscriber?.(event);
    });

    expect(result.current).toEqual({ error, isRetrying: true, name: "chunk-error" });
  });

  it("ignores non-chunk-error events", () => {
    const { result } = renderHook(() => useSPAGuardChunkError());

    const events: SPAGuardEvent[] = [
      { name: "fallback-ui-shown" },
      { attempt: 1, delay: 1000, name: "retry-attempt", retryId: "abc" },
      { finalAttempt: 3, name: "retry-exhausted", retryId: "abc" },
      { name: "retry-reset", previousAttempt: 3, previousRetryId: "abc", timeSinceReload: 5000 },
      { attempt: 1, delay: 1000, name: "lazy-retry-attempt", totalAttempts: 3 },
      { name: "lazy-retry-exhausted", totalAttempts: 3, willReload: true },
      { attempt: 2, name: "lazy-retry-success" },
    ];

    act(() => {
      for (const event of events) {
        capturedSubscriber?.(event);
      }
    });

    expect(result.current).toBeNull();
  });

  it("updates when a new chunk-error is emitted", () => {
    const { result } = renderHook(() => useSPAGuardChunkError());

    const error1 = new Error("first error");
    act(() => {
      capturedSubscriber?.({ error: error1, isRetrying: true, name: "chunk-error" });
    });
    expect(result.current?.error).toBe(error1);
    expect(result.current?.isRetrying).toBe(true);

    const error2 = new Error("second error");
    act(() => {
      capturedSubscriber?.({ error: error2, isRetrying: false, name: "chunk-error" });
    });
    expect(result.current?.error).toBe(error2);
    expect(result.current?.isRetrying).toBe(false);
  });

  it("only responds to chunk-error among mixed events", () => {
    const { result } = renderHook(() => useSPAGuardChunkError());

    const chunkError = new Error("chunk fail");
    act(() => {
      capturedSubscriber?.({ name: "fallback-ui-shown" });
      capturedSubscriber?.({ error: chunkError, isRetrying: false, name: "chunk-error" });
      capturedSubscriber?.({ attempt: 1, delay: 1000, name: "retry-attempt", retryId: "abc" });
    });

    expect(result.current).toEqual({ error: chunkError, isRetrying: false, name: "chunk-error" });
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useSPAGuardChunkError());

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("subscribes only once", () => {
    const { rerender } = renderHook(() => useSPAGuardChunkError());

    rerender();
    rerender();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });
});
