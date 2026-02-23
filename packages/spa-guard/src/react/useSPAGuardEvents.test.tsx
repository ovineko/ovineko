import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SPAGuardEvent, SubscribeFn } from "../common/events/types";

vi.mock("../common/events/internal", () => ({
  subscribe: vi.fn(),
}));

import { subscribe } from "../common/events/internal";
import { useSPAGuardEvents } from "./useSPAGuardEvents";

const mockSubscribe = vi.mocked(subscribe);

describe("useSPAGuardEvents", () => {
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

  it("subscribes to events on mount", () => {
    const callback = vi.fn();
    renderHook(() => useSPAGuardEvents(callback));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it("forwards events to the callback", () => {
    const callback = vi.fn();
    renderHook(() => useSPAGuardEvents(callback));

    const event: SPAGuardEvent = {
      error: new Error("fail"),
      isRetrying: false,
      name: "chunk-error",
    };
    act(() => {
      capturedSubscriber?.(event);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(event);
  });

  it("forwards different event types", () => {
    const callback = vi.fn();
    renderHook(() => useSPAGuardEvents(callback));

    const events: SPAGuardEvent[] = [
      { error: new Error("fail"), isRetrying: true, name: "chunk-error" },
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

    expect(callback).toHaveBeenCalledTimes(events.length);
    for (const [i, event_] of events.entries()) {
      expect(callback).toHaveBeenNthCalledWith(i + 1, event_);
    }
  });

  it("unsubscribes on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useSPAGuardEvents(callback));

    expect(mockUnsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("uses latest callback without resubscribing", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { rerender } = renderHook(({ cb }) => useSPAGuardEvents(cb), {
      initialProps: { cb: callback1 },
    });

    // Rerender with a new callback
    rerender({ cb: callback2 });

    // Should NOT have re-subscribed
    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    // Event should go to the latest callback
    const event: SPAGuardEvent = { name: "fallback-ui-shown" };
    act(() => {
      capturedSubscriber?.(event);
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith(event);
  });

  it("does not resubscribe on rerender", () => {
    const callback = vi.fn();
    const { rerender } = renderHook(() => useSPAGuardEvents(callback));

    rerender();
    rerender();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it("handles multiple hook instances independently", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const unsubscribeFns = [vi.fn(), vi.fn()];
    let callCount = 0;
    const capturedSubscribers: SubscribeFn[] = [];

    mockSubscribe.mockImplementation((cb) => {
      capturedSubscribers.push(cb);
      const unsub = unsubscribeFns[callCount++];
      return unsub ?? vi.fn();
    });

    const { unmount: unmount1 } = renderHook(() => useSPAGuardEvents(callback1));
    renderHook(() => useSPAGuardEvents(callback2));

    expect(mockSubscribe).toHaveBeenCalledTimes(2);

    // Emit event - both should receive
    const event: SPAGuardEvent = {
      error: new Error("test"),
      isRetrying: false,
      name: "chunk-error",
    };
    act(() => {
      for (const sub of capturedSubscribers) {
        sub(event);
      }
    });

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);

    // Unmount first - only first unsubscribes
    unmount1();
    expect(unsubscribeFns[0]).toHaveBeenCalledTimes(1);
    expect(unsubscribeFns[1]).not.toHaveBeenCalled();
  });
});
