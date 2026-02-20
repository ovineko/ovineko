import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SPAGuardEvent } from "./types";

import { emitEvent, subscribe, subscribers } from "./internal";

describe("common/events/internal", () => {
  beforeEach(() => {
    subscribers.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("emitEvent() - subscriber notification", () => {
    it("calls a single subscriber with the emitted event", () => {
      const cb = vi.fn();
      subscribe(cb);

      emitEvent({ name: "fallback-ui-shown" });

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("calls all registered subscribers when an event is emitted", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const cb3 = vi.fn();
      subscribe(cb1);
      subscribe(cb2);
      subscribe(cb3);

      emitEvent({ name: "fallback-ui-shown" });

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(cb3).toHaveBeenCalledTimes(1);
    });

    it("all subscribers receive the same event object reference", () => {
      const received: SPAGuardEvent[] = [];
      subscribe((event) => received.push(event));
      subscribe((event) => received.push(event));

      const event: SPAGuardEvent = { name: "fallback-ui-shown" };
      emitEvent(event);

      expect(received).toHaveLength(2);
      expect(received[0]).toBe(event);
      expect(received[1]).toBe(event);
    });

    it("does not throw when no subscribers are registered", () => {
      expect(() => {
        emitEvent({ name: "fallback-ui-shown" });
      }).not.toThrow();
    });

    it("calls subscribers in insertion order", () => {
      const callOrder: number[] = [];
      subscribe(() => callOrder.push(1));
      subscribe(() => callOrder.push(2));
      subscribe(() => callOrder.push(3));

      emitEvent({ name: "fallback-ui-shown" });

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("calls the same subscriber multiple times when multiple events are emitted", () => {
      const cb = vi.fn();
      subscribe(cb);

      emitEvent({ name: "fallback-ui-shown" });
      emitEvent({ attempt: 1, delay: 500, name: "retry-attempt", retryId: "id1" });

      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe("subscribe() - subscription lifecycle", () => {
    it("returns an unsubscribe function", () => {
      const unsubscribe = subscribe(vi.fn());
      expect(typeof unsubscribe).toBe("function");
    });

    it("unsubscribe prevents the subscriber from receiving future events", () => {
      const cb = vi.fn();
      const unsubscribe = subscribe(cb);

      unsubscribe();
      emitEvent({ name: "fallback-ui-shown" });

      expect(cb).not.toHaveBeenCalled();
    });

    it("unsubscribing one subscriber does not affect other subscribers", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const unsubscribe1 = subscribe(cb1);
      subscribe(cb2);

      unsubscribe1();
      emitEvent({ name: "fallback-ui-shown" });

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it("calling unsubscribe multiple times does not throw", () => {
      const unsubscribe = subscribe(vi.fn());

      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });

    it("re-subscribing after unsubscribing works correctly", () => {
      const cb = vi.fn();
      const unsubscribe = subscribe(cb);

      emitEvent({ name: "fallback-ui-shown" });
      unsubscribe();
      emitEvent({ name: "fallback-ui-shown" });

      subscribe(cb);
      emitEvent({ name: "fallback-ui-shown" });

      // Called twice: once before unsubscribe, once after re-subscribe
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it("adding the same callback twice registers it once (Set behavior)", () => {
      const cb = vi.fn();
      subscribe(cb);
      subscribe(cb);

      emitEvent({ name: "fallback-ui-shown" });

      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("event data propagation", () => {
    it("passes retry-attempt event fields correctly to subscribers", () => {
      const cb = vi.fn();
      subscribe(cb);

      const event: SPAGuardEvent = {
        attempt: 2,
        delay: 1000,
        name: "retry-attempt",
        retryId: "abc-123",
      };
      emitEvent(event);

      expect(cb).toHaveBeenCalledWith({
        attempt: 2,
        delay: 1000,
        name: "retry-attempt",
        retryId: "abc-123",
      });
    });

    it("passes retry-exhausted event fields correctly to subscribers", () => {
      const cb = vi.fn();
      subscribe(cb);

      const event: SPAGuardEvent = {
        finalAttempt: 3,
        name: "retry-exhausted",
        retryId: "xyz-789",
      };
      emitEvent(event);

      expect(cb).toHaveBeenCalledWith({
        finalAttempt: 3,
        name: "retry-exhausted",
        retryId: "xyz-789",
      });
    });

    it("passes retry-reset event fields correctly to subscribers", () => {
      const cb = vi.fn();
      subscribe(cb);

      const event: SPAGuardEvent = {
        name: "retry-reset",
        previousAttempt: 2,
        previousRetryId: "old-id",
        timeSinceReload: 5000,
      };
      emitEvent(event);

      expect(cb).toHaveBeenCalledWith({
        name: "retry-reset",
        previousAttempt: 2,
        previousRetryId: "old-id",
        timeSinceReload: 5000,
      });
    });

    it("passes fallback-ui-shown event correctly to subscribers", () => {
      const cb = vi.fn();
      subscribe(cb);

      emitEvent({ name: "fallback-ui-shown" });

      expect(cb).toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("passes lazy-retry-attempt event fields correctly to subscribers", () => {
      const cb = vi.fn();
      subscribe(cb);

      const event: SPAGuardEvent = {
        attempt: 1,
        delay: 200,
        name: "lazy-retry-attempt",
        totalAttempts: 3,
      };
      emitEvent(event);

      expect(cb).toHaveBeenCalledWith({
        attempt: 1,
        delay: 200,
        name: "lazy-retry-attempt",
        totalAttempts: 3,
      });
    });

    it("passes lazy-retry-exhausted event fields correctly to subscribers", () => {
      const cb = vi.fn();
      subscribe(cb);

      const event: SPAGuardEvent = {
        name: "lazy-retry-exhausted",
        totalAttempts: 3,
        willReload: true,
      };
      emitEvent(event);

      expect(cb).toHaveBeenCalledWith({
        name: "lazy-retry-exhausted",
        totalAttempts: 3,
        willReload: true,
      });
    });

    it("passes lazy-retry-success event fields correctly to subscribers", () => {
      const cb = vi.fn();
      subscribe(cb);

      const event: SPAGuardEvent = {
        attempt: 2,
        name: "lazy-retry-success",
      };
      emitEvent(event);

      expect(cb).toHaveBeenCalledWith({
        attempt: 2,
        name: "lazy-retry-success",
      });
    });
  });

  describe("edge cases", () => {
    it("does not throw and notifies zero subscribers when subscribers set is empty", () => {
      expect(subscribers.size).toBe(0);
      expect(() => emitEvent({ name: "fallback-ui-shown" })).not.toThrow();
    });

    it("subscriber throwing causes the error to propagate out of emitEvent", () => {
      subscribe(() => {
        throw new Error("subscriber error");
      });

      expect(() => emitEvent({ name: "fallback-ui-shown" })).toThrow("subscriber error");
    });

    it("subscriber throwing prevents subsequent subscribers from being called", () => {
      const cbAfter = vi.fn();
      subscribe(() => {
        throw new Error("first subscriber fails");
      });
      subscribe(cbAfter);

      try {
        emitEvent({ name: "fallback-ui-shown" });
      } catch {
        // expected
      }

      // Set.forEach propagates the throw and stops iteration
      expect(cbAfter).not.toHaveBeenCalled();
    });

    it("unsubscribing later-added subscriber during emit prevents it from being called", () => {
      const callOrder: string[] = [];
      const unsubscribeRef: { fn: (() => void) | undefined } = { fn: undefined };

      subscribe(() => {
        callOrder.push("A");
        unsubscribeRef.fn?.();
      });

      unsubscribeRef.fn = subscribe(() => {
        callOrder.push("B");
      });

      emitEvent({ name: "fallback-ui-shown" });

      // A was called, but B was deleted before being visited by Set.forEach
      expect(callOrder).toEqual(["A"]);
    });

    it("unsubscribing self during emit (subscriber removes itself)", () => {
      const cb = vi.fn();
      const unsubscribeRef: { fn: (() => void) | undefined } = { fn: undefined };
      const selfRemovingCb = () => {
        cb();
        unsubscribeRef.fn?.();
      };
      unsubscribeRef.fn = subscribe(selfRemovingCb);

      emitEvent({ name: "fallback-ui-shown" });
      emitEvent({ name: "fallback-ui-shown" });

      // Only called once - removed itself on first call
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("subscriber added during emit is visited in the current emit (V8 Set.forEach behavior)", () => {
      const lateSubscriber = vi.fn();

      subscribe(() => {
        subscribe(lateSubscriber);
      });

      emitEvent({ name: "fallback-ui-shown" });

      // V8 Set.forEach visits entries added during iteration before the iteration ends
      expect(lateSubscriber).toHaveBeenCalledTimes(1);

      // Also called on subsequent emits
      emitEvent({ name: "fallback-ui-shown" });
      expect(lateSubscriber).toHaveBeenCalledTimes(2);
    });

    it("subscribers set is backed by window[eventSubscribersWindowKey] when window exists", async () => {
      // The subscribers Set should be the same object stored on window
      const { eventSubscribersWindowKey } = await import("../constants");
      const windowSet = (globalThis.window as any)?.[eventSubscribersWindowKey];

      expect(windowSet).toBe(subscribers);
    });
  });
});
