import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearLastReloadTime,
  clearLastRetryResetInfo,
  getLastReloadTime,
  getLastRetryResetInfo,
  setLastReloadTime,
  setLastRetryResetInfo,
  shouldResetRetryCycle,
} from "./lastReloadTime";

const STORAGE_KEY = "__spa_guard_last_reload_timestamp__";
const RESET_INFO_KEY = "__spa_guard_last_retry_reset__";

beforeEach(() => {
  sessionStorage.clear();
  clearLastReloadTime();
  clearLastRetryResetInfo();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
  clearLastReloadTime();
  clearLastRetryResetInfo();
});

describe("setLastReloadTime", () => {
  it("stores retryId and attemptNumber in sessionStorage", () => {
    setLastReloadTime("retry-123", 2);
    const stored = sessionStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.retryId).toBe("retry-123");
    expect(parsed.attemptNumber).toBe(2);
  });

  it("records current timestamp", () => {
    const before = Date.now();
    setLastReloadTime("retry-abc", 1);
    const after = Date.now();
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    expect(stored.timestamp).toBeGreaterThanOrEqual(before);
    expect(stored.timestamp).toBeLessThanOrEqual(after);
  });

  it("overwrites previous stored data", () => {
    setLastReloadTime("first-id", 1);
    setLastReloadTime("second-id", 3);
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    expect(stored.retryId).toBe("second-id");
    expect(stored.attemptNumber).toBe(3);
  });

  it("falls back to in-memory when sessionStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("StorageError");
    });

    setLastReloadTime("retry-fallback", 2);
    const result = getLastReloadTime();

    expect(result).not.toBeNull();
    expect(result!.retryId).toBe("retry-fallback");
    expect(result!.attemptNumber).toBe(2);
  });
});

describe("getLastReloadTime", () => {
  it("returns null when no data has been stored", () => {
    expect(getLastReloadTime()).toBeNull();
  });

  it("returns stored data after setLastReloadTime", () => {
    setLastReloadTime("retry-xyz", 3);
    const result = getLastReloadTime();
    expect(result).not.toBeNull();
    expect(result!.retryId).toBe("retry-xyz");
    expect(result!.attemptNumber).toBe(3);
  });

  it("reads data from sessionStorage on retrieval", () => {
    const data = { attemptNumber: 5, retryId: "direct-set", timestamp: 1_234_567_890 };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = getLastReloadTime();
    expect(result).not.toBeNull();
    expect(result!.retryId).toBe("direct-set");
    expect(result!.attemptNumber).toBe(5);
    expect(result!.timestamp).toBe(1_234_567_890);
  });

  it("returns in-memory fallback when sessionStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("StorageError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("StorageError");
    });

    setLastReloadTime("in-memory-id", 1);
    const result = getLastReloadTime();

    expect(result).not.toBeNull();
    expect(result!.retryId).toBe("in-memory-id");
  });

  it("returns in-memory fallback (null) when sessionStorage contains invalid JSON", () => {
    sessionStorage.setItem(STORAGE_KEY, "invalid-json{");
    const result = getLastReloadTime();
    expect(result).toBeNull();
  });

  it("handles sessionStorage data with NaN timestamp gracefully", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ attemptNumber: 1, retryId: "id", timestamp: null }),
    );
    const result = getLastReloadTime();
    expect(result).not.toBeNull();
    expect(result!.retryId).toBe("id");
  });
});

describe("clearLastReloadTime", () => {
  it("removes stored reload data so getLastReloadTime returns null", () => {
    setLastReloadTime("retry-abc", 1);
    clearLastReloadTime();
    expect(getLastReloadTime()).toBeNull();
  });

  it("removes data from sessionStorage", () => {
    setLastReloadTime("retry-abc", 1);
    clearLastReloadTime();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not throw when no data exists", () => {
    expect(() => clearLastReloadTime()).not.toThrow();
  });

  it("can be called multiple times safely", () => {
    clearLastReloadTime();
    clearLastReloadTime();
    expect(getLastReloadTime()).toBeNull();
  });
});

describe("setLastRetryResetInfo", () => {
  it("stores previousRetryId in sessionStorage", () => {
    setLastRetryResetInfo("old-retry-id");
    const stored = sessionStorage.getItem(RESET_INFO_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.previousRetryId).toBe("old-retry-id");
  });

  it("records current timestamp", () => {
    const before = Date.now();
    setLastRetryResetInfo("some-id");
    const after = Date.now();
    const stored = JSON.parse(sessionStorage.getItem(RESET_INFO_KEY)!);
    expect(stored.timestamp).toBeGreaterThanOrEqual(before);
    expect(stored.timestamp).toBeLessThanOrEqual(after);
  });

  it("overwrites previous reset info", () => {
    setLastRetryResetInfo("id-one");
    setLastRetryResetInfo("id-two");
    const stored = JSON.parse(sessionStorage.getItem(RESET_INFO_KEY)!);
    expect(stored.previousRetryId).toBe("id-two");
  });

  it("falls back to in-memory when sessionStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("StorageError");
    });

    setLastRetryResetInfo("fallback-id");
    const result = getLastRetryResetInfo();

    expect(result).not.toBeNull();
    expect(result!.previousRetryId).toBe("fallback-id");
  });
});

describe("getLastRetryResetInfo", () => {
  it("returns null when no reset info has been stored", () => {
    expect(getLastRetryResetInfo()).toBeNull();
  });

  it("returns stored reset info after setLastRetryResetInfo", () => {
    setLastRetryResetInfo("old-retry-id");
    const result = getLastRetryResetInfo();
    expect(result).not.toBeNull();
    expect(result!.previousRetryId).toBe("old-retry-id");
  });

  it("reads data directly from sessionStorage", () => {
    const data = { previousRetryId: "direct-set", timestamp: 9_999_999 };
    sessionStorage.setItem(RESET_INFO_KEY, JSON.stringify(data));
    const result = getLastRetryResetInfo();
    expect(result).not.toBeNull();
    expect(result!.previousRetryId).toBe("direct-set");
    expect(result!.timestamp).toBe(9_999_999);
  });

  it("returns in-memory fallback when sessionStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("StorageError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("StorageError");
    });

    setLastRetryResetInfo("memory-reset-id");
    const result = getLastRetryResetInfo();
    expect(result).not.toBeNull();
    expect(result!.previousRetryId).toBe("memory-reset-id");
  });

  it("returns null when sessionStorage contains invalid JSON for reset info", () => {
    sessionStorage.setItem(RESET_INFO_KEY, "not-valid-json");
    const result = getLastRetryResetInfo();
    expect(result).toBeNull();
  });
});

describe("clearLastRetryResetInfo", () => {
  it("removes stored reset info so getLastRetryResetInfo returns null", () => {
    setLastRetryResetInfo("old-id");
    clearLastRetryResetInfo();
    expect(getLastRetryResetInfo()).toBeNull();
  });

  it("removes data from sessionStorage", () => {
    setLastRetryResetInfo("old-id");
    clearLastRetryResetInfo();
    expect(sessionStorage.getItem(RESET_INFO_KEY)).toBeNull();
  });

  it("does not throw when no data exists", () => {
    expect(() => clearLastRetryResetInfo()).not.toThrow();
  });
});

describe("shouldResetRetryCycle", () => {
  it("returns false when retryAttempt is 0", () => {
    setLastReloadTime("retry-abc", 1);
    const retryState = { retryAttempt: 0, retryId: "retry-abc" };
    expect(shouldResetRetryCycle(retryState, [1000])).toBe(false);
  });

  it("returns false when no last reload data exists", () => {
    const retryState = { retryAttempt: 1, retryId: "retry-abc" };
    expect(shouldResetRetryCycle(retryState, [1000])).toBe(false);
  });

  it("returns false when retryId does not match stored retryId", () => {
    setLastReloadTime("stored-id", 1);
    const retryState = { retryAttempt: 1, retryId: "different-id" };
    expect(shouldResetRetryCycle(retryState, [1000])).toBe(false);
  });

  it("returns true when enough time has passed since last reload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    setLastReloadTime("retry-abc", 1);
    vi.advanceTimersByTime(2000);

    const retryState = { retryAttempt: 1, retryId: "retry-abc" };
    expect(shouldResetRetryCycle(retryState, [1000])).toBe(true);
  });

  it("returns false when not enough time has passed since last reload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    setLastReloadTime("retry-abc", 1);
    vi.advanceTimersByTime(500);

    const retryState = { retryAttempt: 1, retryId: "retry-abc" };
    expect(shouldResetRetryCycle(retryState, [1000])).toBe(false);
  });

  it("returns false when minTimeBetweenResets has not elapsed since last reset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    setLastReloadTime("retry-abc", 1);
    setLastRetryResetInfo("old-id");

    vi.advanceTimersByTime(2000);

    const retryState = { retryAttempt: 1, retryId: "retry-abc" };
    expect(shouldResetRetryCycle(retryState, [1000], 5000)).toBe(false);
  });

  it("returns true when both time since reload and minTimeBetweenResets have elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    setLastReloadTime("retry-abc", 1);
    setLastRetryResetInfo("old-id");

    vi.advanceTimersByTime(6000);

    const retryState = { retryAttempt: 1, retryId: "retry-abc" };
    expect(shouldResetRetryCycle(retryState, [1000], 5000)).toBe(true);
  });

  it("uses default minTimeBetweenResets of 5000ms when not specified", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    setLastReloadTime("retry-abc", 1);
    setLastRetryResetInfo("old-id");

    vi.advanceTimersByTime(3000);

    const retryState = { retryAttempt: 1, retryId: "retry-abc" };
    // 3000ms < 5000ms default, so should return false
    expect(shouldResetRetryCycle(retryState, [1000])).toBe(false);
  });

  it("uses default delay of 1000ms when reloadDelays does not cover the attempt index", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    // attemptNumber = 2, previousDelayIndex = 1, but reloadDelays only has index 0
    setLastReloadTime("retry-abc", 2);
    vi.advanceTimersByTime(1500);

    const retryState = { retryAttempt: 2, retryId: "retry-abc" };
    // defaults to 1000ms, and 1500ms > 1000ms => true
    expect(shouldResetRetryCycle(retryState, [2000])).toBe(true);
  });

  it("uses actual reloadDelays entry for the previous attempt index", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    // attemptNumber = 2, previousDelayIndex = 1, reloadDelays[1] = 3000
    setLastReloadTime("retry-abc", 2);
    vi.advanceTimersByTime(2000);

    const retryState = { retryAttempt: 2, retryId: "retry-abc" };
    // 2000ms < 3000ms => false
    expect(shouldResetRetryCycle(retryState, [1000, 3000])).toBe(false);
  });

  it("returns true with no lastReset info (no minimum time constraint)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    setLastReloadTime("retry-abc", 1);
    // No setLastRetryResetInfo call
    vi.advanceTimersByTime(2000);

    const retryState = { retryAttempt: 1, retryId: "retry-abc" };
    expect(shouldResetRetryCycle(retryState, [1000])).toBe(true);
  });
});
