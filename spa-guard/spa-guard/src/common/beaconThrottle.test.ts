import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./options", () => ({ getOptions: vi.fn() }));

import { getOptions } from "./options";
import { internalConfig } from "./events/internal";
import { listenInternal } from "./listen/internal";
import { serializeError } from "./serializeError";
import {
  getBeaconThrottleDecision,
  registerBeaconThrottleFlush,
  resetBeaconThrottle,
} from "./beaconThrottle";

const mockGetOptions = vi.mocked(getOptions);
const beacon = { errorMessage: "same", eventName: "error", url: "https://cdn.example.com/a.js" };

describe("beacon throttle", () => {
  beforeEach(() => {
    resetBeaconThrottle();
    vi.useFakeTimers();
    vi.setSystemTime(0);
    mockGetOptions.mockReturnValue({
      reportBeacon: { dedupe: true, dedupeWindowMs: 100, maxPerPageLoad: 20 },
    });
  });

  afterEach(() => {
    internalConfig.initialized = false;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("suppresses the same key inside the dedupe window", () => {
    expect(getBeaconThrottleDecision(beacon).send).toBe(true);
    expect(getBeaconThrottleDecision(beacon).send).toBe(false);
  });

  it("keeps distinct event messages distinct", () => {
    expect(getBeaconThrottleDecision({ ...beacon, eventMessage: "directive-a" }).send).toBe(true);
    expect(getBeaconThrottleDecision({ ...beacon, eventMessage: "directive-b" }).send).toBe(true);
  });

  it("keeps reports from distinct applications distinct", () => {
    expect(getBeaconThrottleDecision({ ...beacon, appName: "dashboard" }).send).toBe(true);
    expect(getBeaconThrottleDecision({ ...beacon, appName: "checkout" }).send).toBe(true);
  });

  it("does not collide when diagnostic fields contain separator characters", () => {
    expect(
      getBeaconThrottleDecision({ ...beacon, errorType: "b", eventName: "a\u0000" }).send,
    ).toBe(true);
    expect(
      getBeaconThrottleDecision({ ...beacon, errorType: "\u0000b", eventName: "a" }).send,
    ).toBe(true);
  });

  it("allows a key after the window and refreshes its timestamp", () => {
    expect(getBeaconThrottleDecision(beacon).send).toBe(true);
    vi.advanceTimersByTime(100);
    expect(getBeaconThrottleDecision(beacon).send).toBe(true);
    vi.advanceTimersByTime(99);
    expect(getBeaconThrottleDecision(beacon).send).toBe(false);
  });

  it("reports newly dropped beacons after an earlier flush", () => {
    mockGetOptions.mockReturnValue({ reportBeacon: { dedupe: false, maxPerPageLoad: 1 } });
    const flush = vi.fn();
    registerBeaconThrottleFlush(flush);
    expect(getBeaconThrottleDecision(beacon)).toMatchObject({ send: true, dropped: 0 });
    expect(getBeaconThrottleDecision({ ...beacon, errorMessage: "next" })).toMatchObject({
      send: true,
      throttled: true,
      dropped: 1,
    });
    expect(getBeaconThrottleDecision({ ...beacon, errorMessage: "last" })).toMatchObject({
      send: false,
      dropped: 2,
    });
    window.dispatchEvent(new Event("pagehide"));
    expect(flush).toHaveBeenCalledWith(2);
    expect(getBeaconThrottleDecision({ ...beacon, errorMessage: "later" })).toMatchObject({
      send: false,
      dropped: 3,
    });
    window.dispatchEvent(new Event("pagehide"));
    expect(flush).toHaveBeenCalledWith(3);
  });

  it("flushes when the document becomes hidden", () => {
    mockGetOptions.mockReturnValue({ reportBeacon: { dedupe: false, maxPerPageLoad: 1 } });
    const flush = vi.fn();
    registerBeaconThrottleFlush(flush);
    getBeaconThrottleDecision(beacon);
    getBeaconThrottleDecision({ ...beacon, errorMessage: "next" });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

    document.dispatchEvent(new Event("visibilitychange"));

    expect(flush).toHaveBeenCalledWith(1);
  });

  it("evicts the oldest retained key", () => {
    mockGetOptions.mockReturnValue({ reportBeacon: { dedupe: true, maxPerPageLoad: 0 } });
    for (let index = 0; index < 256; index += 1) {
      expect(getBeaconThrottleDecision({ ...beacon, errorMessage: `error-${index}` }).send).toBe(
        true,
      );
    }
    expect(getBeaconThrottleDecision({ ...beacon, errorMessage: "error-256" }).send).toBe(true);
    expect(getBeaconThrottleDecision({ ...beacon, errorMessage: "error-0" }).send).toBe(true);
  });

  it("supports disabled deduplication and disabled caps", () => {
    mockGetOptions.mockReturnValue({ reportBeacon: { dedupe: false, maxPerPageLoad: 0 } });
    expect(getBeaconThrottleDecision(beacon).send).toBe(true);
    expect(getBeaconThrottleDecision(beacon).send).toBe(true);
    mockGetOptions.mockReturnValue({ reportBeacon: { dedupe: false, maxPerPageLoad: Infinity } });
    expect(getBeaconThrottleDecision(beacon).send).toBe(true);
  });

  it("keeps Infinity disabled after build-time JSON serialization", () => {
    // JSON round-tripping is the behavior of the Vite and Node script builders under test.
    // eslint-disable-next-line unicorn/prefer-structured-clone
    const config = JSON.parse(
      JSON.stringify({ dedupe: false, maxPerPageLoad: Infinity }),
    ) as Parameters<typeof getBeaconThrottleDecision>[1];

    for (let index = 0; index < 25; index += 1) {
      expect(
        getBeaconThrottleDecision({ ...beacon, errorMessage: `error-${index}` }, config).send,
      ).toBe(true);
    }
  });

  it("deduplicates stable identifiers despite different serialized diagnostics", () => {
    expect(getBeaconThrottleDecision({ ...beacon, serialized: '{"requestId":"one"}' }).send).toBe(
      true,
    );
    expect(getBeaconThrottleDecision({ ...beacon, serialized: '{"requestId":"two"}' }).send).toBe(
      false,
    );
  });

  it("sends one beacon for repeated resource errors with different event timestamps", () => {
    mockGetOptions.mockReturnValue({
      reportBeacon: {
        dedupe: true,
        endpoint: "/beacon",
        maxPerPageLoad: 20,
      },
      resources: { report: "code" },
      staticAssets: { autoRecover: false },
    });
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.spyOn(window.navigator, "sendBeacon").mockImplementation(sendBeacon);
    let errorHandler: EventListener | undefined;
    vi.spyOn(window, "addEventListener").mockImplementation((type, handler) => {
      if (type === "error") {
        errorHandler = handler as EventListener;
      }
    });
    const serialized: string[] = [];
    listenInternal((error) => {
      const result = serializeError(error);
      serialized.push(result);
      return result;
    });
    const target = document.createElement("script");
    target.src = "https://cdn.example.com/app.js";

    for (const timeStamp of [803.777333, 804.88125, 806.14, 807.25, 808.36]) {
      const event = new Event("error");
      Object.defineProperties(event, {
        target: { value: target },
        timeStamp: { value: timeStamp },
      });
      errorHandler?.(event);
    }

    expect(new Set(serialized)).toHaveLength(5);
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("enables deduplication when omitted", () => {
    const config = { maxPerPageLoad: 0 };
    expect(getBeaconThrottleDecision(beacon, config).send).toBe(true);
    expect(getBeaconThrottleDecision(beacon, config).send).toBe(false);
  });

  it("uses the default cap when omitted", () => {
    const config = { dedupe: false };
    for (let index = 0; index < 20; index += 1) {
      expect(
        getBeaconThrottleDecision({ ...beacon, errorMessage: `error-${index}` }, config).send,
      ).toBe(true);
    }
    expect(
      getBeaconThrottleDecision({ ...beacon, errorMessage: "overflow" }, config).throttled,
    ).toBe(true);
  });

  it("uses the default cap for a negative cap", () => {
    mockGetOptions.mockReturnValue({ reportBeacon: { dedupe: false, maxPerPageLoad: -1 } });
    for (let index = 0; index < 20; index += 1) {
      expect(getBeaconThrottleDecision({ ...beacon, errorMessage: `error-${index}` }).send).toBe(
        true,
      );
    }
    expect(getBeaconThrottleDecision({ ...beacon, errorMessage: "overflow" }).throttled).toBe(true);
  });

  it("reset clears state and removes registered listeners", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    registerBeaconThrottleFlush(vi.fn());
    resetBeaconThrottle();
    expect(remove).toHaveBeenCalledWith("pagehide", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(getBeaconThrottleDecision(beacon).send).toBe(true);
  });
});
