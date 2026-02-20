import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../runtime", () => ({
  getState: vi.fn(),
  subscribeToState: vi.fn(),
}));

import type { SpaGuardState } from "../runtime";

import { useSpaGuardState } from ".";
import { getState, subscribeToState } from "../runtime";

const mockGetState = vi.mocked(getState);
const mockSubscribeToState = vi.mocked(subscribeToState);

const defaultState: SpaGuardState = {
  currentAttempt: 0,
  isFallbackShown: false,
  isWaiting: false,
};

describe("useSpaGuardState", () => {
  let capturedCallback: ((state: SpaGuardState) => void) | null = null;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    capturedCallback = null;
    mockUnsubscribe.mockReset();
    mockGetState.mockReturnValue({ ...defaultState });
    mockSubscribeToState.mockImplementation((cb) => {
      capturedCallback = cb;
      cb({ ...defaultState });
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("returns state immediately provided by subscribeToState callback", () => {
      const initialState: SpaGuardState = {
        currentAttempt: 2,
        isFallbackShown: false,
        isWaiting: true,
      };
      mockGetState.mockReturnValue(initialState);
      mockSubscribeToState.mockImplementation((cb) => {
        capturedCallback = cb;
        cb(initialState);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useSpaGuardState());

      expect(result.current).toEqual(initialState);
    });

    it("returns default state when runtime state has default values", () => {
      const { result } = renderHook(() => useSpaGuardState());

      expect(result.current).toEqual({
        currentAttempt: 0,
        isFallbackShown: false,
        isWaiting: false,
      });
    });

    it("reflects isFallbackShown=true from initial state", () => {
      const fallbackState: SpaGuardState = { ...defaultState, isFallbackShown: true };
      mockGetState.mockReturnValue(fallbackState);
      mockSubscribeToState.mockImplementation((cb) => {
        capturedCallback = cb;
        cb(fallbackState);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useSpaGuardState());

      expect(result.current.isFallbackShown).toBe(true);
      expect(result.current.currentAttempt).toBe(0);
      expect(result.current.isWaiting).toBe(false);
    });

    it("includes optional reset fields from initial state", () => {
      const stateWithReset: SpaGuardState = {
        ...defaultState,
        lastResetRetryId: "prev-retry-id",
        lastRetryResetTime: 1_700_000_000_000,
      };
      mockGetState.mockReturnValue(stateWithReset);
      mockSubscribeToState.mockImplementation((cb) => {
        capturedCallback = cb;
        cb(stateWithReset);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useSpaGuardState());

      expect(result.current.lastResetRetryId).toBe("prev-retry-id");
      expect(result.current.lastRetryResetTime).toBe(1_700_000_000_000);
    });

    it("calls subscribeToState once on mount", () => {
      renderHook(() => useSpaGuardState());

      expect(mockSubscribeToState).toHaveBeenCalledTimes(1);
    });
  });

  describe("state updates when runtime state changes", () => {
    it("re-renders when isFallbackShown changes to true", () => {
      const { result } = renderHook(() => useSpaGuardState());

      expect(result.current.isFallbackShown).toBe(false);

      act(() => {
        capturedCallback?.({ ...defaultState, isFallbackShown: true });
      });

      expect(result.current.isFallbackShown).toBe(true);
    });

    it("re-renders when currentAttempt and isWaiting change", () => {
      const { result } = renderHook(() => useSpaGuardState());

      expect(result.current.currentAttempt).toBe(0);
      expect(result.current.isWaiting).toBe(false);

      act(() => {
        capturedCallback?.({ ...defaultState, currentAttempt: 3, isWaiting: true });
      });

      expect(result.current.currentAttempt).toBe(3);
      expect(result.current.isWaiting).toBe(true);
    });

    it("re-renders when reset fields are added to state", () => {
      const { result } = renderHook(() => useSpaGuardState());

      expect(result.current.lastResetRetryId).toBeUndefined();

      act(() => {
        capturedCallback?.({
          ...defaultState,
          lastResetRetryId: "reset-id-abc",
          lastRetryResetTime: 1_700_000_000_000,
        });
      });

      expect(result.current.lastResetRetryId).toBe("reset-id-abc");
      expect(result.current.lastRetryResetTime).toBe(1_700_000_000_000);
    });

    it("reflects the complete state object on each update", () => {
      const { result } = renderHook(() => useSpaGuardState());

      const updatedState: SpaGuardState = {
        currentAttempt: 5,
        isFallbackShown: false,
        isWaiting: false,
        lastResetRetryId: "cycle-id",
        lastRetryResetTime: 12_345,
      };

      act(() => {
        capturedCallback?.(updatedState);
      });

      expect(result.current).toEqual(updatedState);
    });
  });

  describe("subscription cleanup on unmount", () => {
    it("calls the unsubscribe function returned by subscribeToState on unmount", () => {
      const { unmount } = renderHook(() => useSpaGuardState());

      expect(mockUnsubscribe).not.toHaveBeenCalled();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it("does not call unsubscribe before unmount", () => {
      renderHook(() => useSpaGuardState());

      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });

    it("cleanup stops future state updates from causing issues", () => {
      const { unmount } = renderHook(() => useSpaGuardState());

      unmount();

      // After unmount, unsubscribe was called - this is what prevents future updates
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("multiple components using same hook - shared state", () => {
    it("each component instance calls subscribeToState independently", () => {
      const capturedCallbacks: Array<(state: SpaGuardState) => void> = [];
      mockSubscribeToState.mockImplementation((cb) => {
        capturedCallbacks.push(cb);
        cb({ ...defaultState });
        return mockUnsubscribe;
      });

      renderHook(() => useSpaGuardState());
      renderHook(() => useSpaGuardState());

      expect(mockSubscribeToState).toHaveBeenCalledTimes(2);
      expect(capturedCallbacks).toHaveLength(2);
    });

    it("all component instances reflect the same state update when notified", () => {
      const capturedCallbacks: Array<(state: SpaGuardState) => void> = [];
      mockSubscribeToState.mockImplementation((cb) => {
        capturedCallbacks.push(cb);
        cb({ ...defaultState });
        return mockUnsubscribe;
      });

      const { result: result1 } = renderHook(() => useSpaGuardState());
      const { result: result2 } = renderHook(() => useSpaGuardState());
      const { result: result3 } = renderHook(() => useSpaGuardState());

      const updatedState: SpaGuardState = { ...defaultState, currentAttempt: 2, isWaiting: true };

      act(() => {
        capturedCallbacks.forEach((cb) => cb(updatedState));
      });

      expect(result1.current.currentAttempt).toBe(2);
      expect(result2.current.currentAttempt).toBe(2);
      expect(result3.current.currentAttempt).toBe(2);
    });

    it("unmounting one component does not affect other mounted components", () => {
      const unsubscribeFns = [vi.fn(), vi.fn()];
      let callCount = 0;
      const capturedCallbacks: Array<(state: SpaGuardState) => void> = [];

      mockSubscribeToState.mockImplementation((cb) => {
        capturedCallbacks.push(cb);
        cb({ ...defaultState });
        const unsubFn = unsubscribeFns[callCount++];
        return unsubFn ?? vi.fn();
      });

      const { unmount: unmount1 } = renderHook(() => useSpaGuardState());
      const { result: result2 } = renderHook(() => useSpaGuardState());

      unmount1();

      expect(unsubscribeFns[0]).toHaveBeenCalledTimes(1);
      expect(unsubscribeFns[1]).not.toHaveBeenCalled();

      // Component 2 still receives updates
      act(() => {
        capturedCallbacks[1]?.({ ...defaultState, isFallbackShown: true });
      });

      expect(result2.current.isFallbackShown).toBe(true);
    });

    it("each component instance cleans up its own subscription on unmount", () => {
      const unsubscribeFns = [vi.fn(), vi.fn()];
      let callCount = 0;

      mockSubscribeToState.mockImplementation((cb) => {
        cb({ ...defaultState });
        const unsubFn = unsubscribeFns[callCount++];
        return unsubFn ?? vi.fn();
      });

      const { unmount: unmount1 } = renderHook(() => useSpaGuardState());
      const { unmount: unmount2 } = renderHook(() => useSpaGuardState());

      unmount1();
      expect(unsubscribeFns[0]).toHaveBeenCalledTimes(1);
      expect(unsubscribeFns[1]).not.toHaveBeenCalled();

      unmount2();
      expect(unsubscribeFns[1]).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("handles unmount before subscribeToState callback is invoked", () => {
      const pendingUnsubscribe = vi.fn();
      mockSubscribeToState.mockImplementation((_cb) => {
        // Do NOT call cb immediately - simulate delayed callback
        return pendingUnsubscribe;
      });

      const { unmount } = renderHook(() => useSpaGuardState());

      // Unmount before any state update is received
      unmount();

      expect(pendingUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it("handles rapid sequential state changes without losing the last update", () => {
      const { result } = renderHook(() => useSpaGuardState());

      act(() => {
        for (let i = 0; i < 10; i++) {
          capturedCallback?.({ ...defaultState, currentAttempt: i });
        }
      });

      expect(result.current.currentAttempt).toBe(9);
    });

    it("handles state change to isFallbackShown=true then back to false", () => {
      const { result } = renderHook(() => useSpaGuardState());

      act(() => {
        capturedCallback?.({ ...defaultState, isFallbackShown: true });
      });
      expect(result.current.isFallbackShown).toBe(true);

      act(() => {
        capturedCallback?.({ ...defaultState, isFallbackShown: false });
      });
      expect(result.current.isFallbackShown).toBe(false);
    });

    it("handles state with isWaiting=true then isWaiting=false (retry completed)", () => {
      const { result } = renderHook(() => useSpaGuardState());

      act(() => {
        capturedCallback?.({ ...defaultState, currentAttempt: 1, isWaiting: true });
      });
      expect(result.current.isWaiting).toBe(true);

      act(() => {
        capturedCallback?.({ ...defaultState, currentAttempt: 1, isWaiting: false });
      });
      expect(result.current.isWaiting).toBe(false);
      expect(result.current.currentAttempt).toBe(1);
    });

    it("subscribeToState is not called again on re-render (stable subscription)", () => {
      const { rerender } = renderHook(() => useSpaGuardState());

      rerender();
      rerender();

      // subscribeToState should only be called once (on mount), not on re-renders
      expect(mockSubscribeToState).toHaveBeenCalledTimes(1);
    });
  });
});
