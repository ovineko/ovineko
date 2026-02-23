import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { eventSubscribersWindowKey } from "../common/constants";

/**
 * Clears the window-level event subscriber set so each test starts with a
 * fresh event system. Without this, subscribers from a previous test's module
 * load would persist and receive events meant for the current test.
 */
const clearWindowSubscribers = (): void => {
  if (typeof window !== "undefined") {
    (window as any)[eventSubscribersWindowKey] = undefined;
  }
};

describe("runtime/state", () => {
  beforeEach(() => {
    clearWindowSubscribers();
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("getState() - initial state", () => {
    it("returns default state when no URL params and no reset info", async () => {
      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue(null),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));

      const { getState } = await import("./state");

      expect(getState()).toEqual({
        currentAttempt: 0,
        isFallbackShown: false,
        isWaiting: false,
        lastResetRetryId: undefined,
        lastRetryResetTime: undefined,
      });
    });

    it("reads retry attempt from URL params on initial load", async () => {
      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue({
          retryAttempt: 2,
          retryId: "test-retry-id",
        }),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.currentAttempt).toBe(2);
      expect(state.isFallbackShown).toBe(false);
      expect(state.isWaiting).toBe(false);
    });

    it("sets isFallbackShown=true when URL retry attempt is -1 (fallback state)", async () => {
      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue({
          retryAttempt: -1,
          retryId: "test-retry-id",
        }),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.isFallbackShown).toBe(true);
      expect(state.currentAttempt).toBe(0);
      expect(state.isWaiting).toBe(false);
    });

    it("includes reset info from storage when previous retry cycle was reset", async () => {
      const resetInfo = {
        previousRetryId: "old-retry-id-abc",
        timestamp: 1_700_000_000_000,
      };

      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue(null),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(resetInfo),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.lastResetRetryId).toBe("old-retry-id-abc");
      expect(state.lastRetryResetTime).toBe(1_700_000_000_000);
    });

    it("includes reset info even when retry state is present in URL", async () => {
      const resetInfo = {
        previousRetryId: "previous-cycle-id",
        timestamp: 1_700_000_000_000,
      };

      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue({
          retryAttempt: 1,
          retryId: "current-id",
        }),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(resetInfo),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.currentAttempt).toBe(1);
      expect(state.lastResetRetryId).toBe("previous-cycle-id");
      expect(state.lastRetryResetTime).toBe(1_700_000_000_000);
    });

    it("reads retry attempt from attempt-only URL param when retryId is absent (useRetryId: false mode)", async () => {
      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(2),
        getRetryStateFromUrl: vi.fn().mockReturnValue(null),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.currentAttempt).toBe(2);
      expect(state.isFallbackShown).toBe(false);
      expect(state.isWaiting).toBe(false);
    });

    it("includes reset info when using attempt-only URL param", async () => {
      const resetInfo = {
        previousRetryId: "prev-id",
        timestamp: 1_700_000_000_000,
      };

      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(1),
        getRetryStateFromUrl: vi.fn().mockReturnValue(null),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(resetInfo),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.currentAttempt).toBe(1);
      expect(state.lastResetRetryId).toBe("prev-id");
      expect(state.lastRetryResetTime).toBe(1_700_000_000_000);
    });
  });

  describe("subscribeToState() - subscription lifecycle", () => {
    beforeEach(() => {
      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue(null),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));
    });

    it("immediately invokes subscriber with current state on subscription", async () => {
      const { subscribeToState } = await import("./state");
      const cb = vi.fn();

      subscribeToState(cb);

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({
        currentAttempt: 0,
        isFallbackShown: false,
        isWaiting: false,
        lastResetRetryId: undefined,
        lastRetryResetTime: undefined,
      });
    });

    it("invokes subscriber when state changes via event emission", async () => {
      const { subscribeToState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");
      const cb = vi.fn();

      subscribeToState(cb);
      cb.mockClear();

      emitEvent({ name: "fallback-ui-shown" });

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          isFallbackShown: true,
        }),
      );
    });

    it("returns an unsubscribe function that stops future notifications", async () => {
      const { subscribeToState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");
      const cb = vi.fn();

      const unsubscribe = subscribeToState(cb);
      cb.mockClear();

      unsubscribe();

      emitEvent({ name: "fallback-ui-shown" });

      expect(cb).not.toHaveBeenCalled();
    });

    it("multiple subscribers all receive the same state update", async () => {
      const { subscribeToState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const cb3 = vi.fn();

      subscribeToState(cb1);
      subscribeToState(cb2);
      subscribeToState(cb3);
      cb1.mockClear();
      cb2.mockClear();
      cb3.mockClear();

      emitEvent({ name: "fallback-ui-shown" });

      const expectedState = expect.objectContaining({ isFallbackShown: true });
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb1).toHaveBeenCalledWith(expectedState);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledWith(expectedState);
      expect(cb3).toHaveBeenCalledTimes(1);
      expect(cb3).toHaveBeenCalledWith(expectedState);
    });

    it("unsubscribing one subscriber does not affect other subscribers", async () => {
      const { subscribeToState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      const unsubscribe1 = subscribeToState(cb1);
      subscribeToState(cb2);
      cb1.mockClear();
      cb2.mockClear();

      unsubscribe1();

      emitEvent({ name: "fallback-ui-shown" });

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it("calling unsubscribe multiple times does not throw", async () => {
      const { subscribeToState } = await import("./state");
      const cb = vi.fn();

      const unsubscribe = subscribeToState(cb);

      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });
  });

  describe("event-driven state updates", () => {
    beforeEach(() => {
      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue(null),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));
    });

    it("fallback-ui-shown event sets isFallbackShown=true while preserving other fields", async () => {
      const { getState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      emitEvent({ name: "fallback-ui-shown" });

      const state = getState();
      expect(state.isFallbackShown).toBe(true);
      expect(state.currentAttempt).toBe(0);
      expect(state.isWaiting).toBe(false);
    });

    it("retry-attempt event sets currentAttempt and isWaiting=true, clears isFallbackShown", async () => {
      const { getState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      // First set fallback shown state
      emitEvent({ name: "fallback-ui-shown" });
      expect(getState().isFallbackShown).toBe(true);

      emitEvent({
        attempt: 2,
        delay: 1000,
        name: "retry-attempt",
        retryId: "retry-id-123",
      });

      const state = getState();
      expect(state.currentAttempt).toBe(2);
      expect(state.isWaiting).toBe(true);
      expect(state.isFallbackShown).toBe(false);
    });

    it("retry-exhausted event updates currentAttempt to finalAttempt and sets isWaiting=false", async () => {
      const { getState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      emitEvent({
        attempt: 3,
        delay: 2000,
        name: "retry-attempt",
        retryId: "retry-id-456",
      });
      expect(getState().isWaiting).toBe(true);

      emitEvent({
        finalAttempt: 3,
        name: "retry-exhausted",
        retryId: "retry-id-456",
      });

      const state = getState();
      expect(state.currentAttempt).toBe(3);
      expect(state.isWaiting).toBe(false);
      expect(state.isFallbackShown).toBe(false);
    });

    it("retry-reset event resets attempt to 0, clears waiting/fallback, and records previousRetryId with timestamp", async () => {
      const fixedTime = new Date("2025-06-15T12:00:00.000Z").getTime();
      vi.useFakeTimers();
      vi.setSystemTime(fixedTime);

      const { getState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      emitEvent({
        attempt: 2,
        delay: 1000,
        name: "retry-attempt",
        retryId: "old-retry-id",
      });

      emitEvent({
        name: "retry-reset",
        previousAttempt: 2,
        previousRetryId: "old-retry-id",
        timeSinceReload: 6000,
      });

      const state = getState();
      expect(state.currentAttempt).toBe(0);
      expect(state.isWaiting).toBe(false);
      expect(state.isFallbackShown).toBe(false);
      expect(state.lastResetRetryId).toBe("old-retry-id");
      expect(state.lastRetryResetTime).toBe(fixedTime);
    });

    it("retry-reset uses Date.now() for lastRetryResetTime (not event data)", async () => {
      const timeBeforeEvent = Date.now();

      const { getState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      emitEvent({
        name: "retry-reset",
        previousAttempt: 1,
        previousRetryId: "some-id",
        timeSinceReload: 99_999,
      });

      const state = getState();
      expect(state.lastRetryResetTime).toBeGreaterThanOrEqual(timeBeforeEvent);
      expect(state.lastRetryResetTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      vi.doMock("../common/retryState", () => ({
        getRetryAttemptFromUrl: vi.fn().mockReturnValue(null),
        getRetryStateFromUrl: vi.fn().mockReturnValue(null),
      }));
      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));
    });

    it("unsubscribing during a callback does not throw and stops future notifications", async () => {
      const { subscribeToState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      const unsubscribeRef: { fn: (() => void) | undefined } = { fn: undefined };
      const cb = vi.fn(() => {
        unsubscribeRef.fn?.();
      });

      unsubscribeRef.fn = subscribeToState(cb);
      cb.mockClear();

      expect(() => {
        emitEvent({ name: "fallback-ui-shown" });
      }).not.toThrow();

      cb.mockClear();
      emitEvent({ name: "fallback-ui-shown" });
      expect(cb).not.toHaveBeenCalled();
    });

    it("sequential events update state correctly in order", async () => {
      const { subscribeToState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      const stateHistory: ReturnType<
        typeof subscribeToState extends (cb: (s: infer S) => void) => void
          ? (cb: (s: S) => void) => void
          : never
      > extends never
        ? never[]
        : Array<{ currentAttempt: number; isFallbackShown: boolean; isWaiting: boolean }> = [];
      subscribeToState((s) => stateHistory.push({ ...s }));
      stateHistory.splice(0); // discard initial call

      emitEvent({ attempt: 1, delay: 500, name: "retry-attempt", retryId: "r1" });
      emitEvent({ attempt: 2, delay: 1000, name: "retry-attempt", retryId: "r1" });
      emitEvent({ finalAttempt: 2, name: "retry-exhausted", retryId: "r1" });
      emitEvent({ name: "fallback-ui-shown" });

      expect(stateHistory).toHaveLength(4);
      expect(stateHistory[0]).toMatchObject({
        currentAttempt: 1,
        isFallbackShown: false,
        isWaiting: true,
      });
      expect(stateHistory[1]).toMatchObject({
        currentAttempt: 2,
        isFallbackShown: false,
        isWaiting: true,
      });
      expect(stateHistory[2]).toMatchObject({
        currentAttempt: 2,
        isFallbackShown: false,
        isWaiting: false,
      });
      expect(stateHistory[3]).toMatchObject({ isFallbackShown: true });
    });

    it("lazy-retry events (not page-level) do not affect state", async () => {
      const { getState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      const initialState = { ...getState() };

      emitEvent({ attempt: 1, delay: 100, name: "lazy-retry-attempt", totalAttempts: 3 });
      emitEvent({ name: "lazy-retry-exhausted", totalAttempts: 3, willReload: false });
      emitEvent({ attempt: 2, name: "lazy-retry-success" });

      expect(getState()).toEqual(initialState);
    });

    it("getState() returns consistent snapshot across multiple calls without mutation", async () => {
      const { getState } = await import("./state");
      const { emitEvent } = await import("../common/events/internal");

      const snapshot1 = getState();
      const snapshot2 = getState();

      expect(snapshot1).toEqual(snapshot2);

      emitEvent({ name: "fallback-ui-shown" });

      const snapshot3 = getState();
      expect(snapshot3.isFallbackShown).toBe(true);
    });
  });

  describe("URL initialization integration with getRetryStateFromUrl", () => {
    it("uses real getRetryStateFromUrl when URL has retry params", async () => {
      // Explicitly clear any leftover mocks from other describe blocks
      vi.doUnmock("../common/retryState");

      // Set the URL with retry params before importing the module
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          ...window.location,
          href: "http://localhost/?spaGuardRetryId=url-test-id&spaGuardRetryAttempt=3",
          search: "?spaGuardRetryId=url-test-id&spaGuardRetryAttempt=3",
        },
        writable: true,
      });

      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.currentAttempt).toBe(3);
      expect(state.isFallbackShown).toBe(false);

      // Restore
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          ...window.location,
          href: "http://localhost/",
          search: "",
        },
        writable: true,
      });
    });

    it("uses real getRetryAttemptFromUrl when URL has only attempt param (useRetryId: false mode)", async () => {
      // Explicitly clear any leftover mocks from other describe blocks
      vi.doUnmock("../common/retryState");

      // Set the URL with only attempt param (no retryId)
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          ...window.location,
          href: "http://localhost/?spaGuardRetryAttempt=2",
          search: "?spaGuardRetryAttempt=2",
        },
        writable: true,
      });

      vi.doMock("../common/lastReloadTime", () => ({
        getLastRetryResetInfo: vi.fn().mockReturnValue(null),
      }));

      const { getState } = await import("./state");
      const state = getState();

      expect(state.currentAttempt).toBe(2);
      expect(state.isFallbackShown).toBe(false);

      // Restore
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          ...window.location,
          href: "http://localhost/",
          search: "",
        },
        writable: true,
      });
    });
  });
});
