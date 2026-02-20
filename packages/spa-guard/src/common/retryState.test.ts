import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RETRY_ATTEMPT_PARAM, RETRY_ID_PARAM } from "./constants";
import {
  clearRetryStateFromUrl,
  generateRetryId,
  getRetryInfoForBeacon,
  getRetryStateFromUrl,
  updateRetryStateInUrl,
} from "./retryState";

let mockLocationHref: string;
let mockLocationSearch: string;
let mockHistoryReplaceState: ReturnType<typeof vi.fn>;

const setupMockLocation = (url = "http://localhost/"): void => {
  mockLocationHref = url;
  const parsedUrl = new URL(url);
  mockLocationSearch = parsedUrl.search;
  mockHistoryReplaceState = vi.fn();

  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return mockLocationHref;
      },
      set href(val: string) {
        mockLocationHref = val;
      },
      get search() {
        return mockLocationSearch;
      },
    },
    writable: true,
  });

  Object.defineProperty(window, "history", {
    configurable: true,
    value: {
      replaceState: mockHistoryReplaceState,
    },
    writable: true,
  });
};

describe("getRetryStateFromUrl", () => {
  beforeEach(() => {
    setupMockLocation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no retry params present", () => {
    setupMockLocation("http://localhost/");
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null when only retryId present (missing retryAttempt)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null when only retryAttempt present (missing retryId)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=1`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns parsed state when both params present", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=2`);
    const state = getRetryStateFromUrl();
    expect(state).toEqual({
      retryAttempt: 2,
      retryId: "abc123",
    });
  });

  it("parses retryAttempt=0 correctly", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=my-id&${RETRY_ATTEMPT_PARAM}=0`);
    const state = getRetryStateFromUrl();
    expect(state).toEqual({
      retryAttempt: 0,
      retryId: "my-id",
    });
  });

  it("parses fallback state (retryAttempt=-1) correctly", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=my-id&${RETRY_ATTEMPT_PARAM}=-1`);
    const state = getRetryStateFromUrl();
    expect(state).toEqual({
      retryAttempt: -1,
      retryId: "my-id",
    });
  });

  it("returns null when retryAttempt is NaN", () => {
    setupMockLocation(
      `http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=not-a-number`,
    );
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null when retryAttempt is empty string", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("preserves the retryId string exactly", () => {
    const retryId = "550e8400-e29b-41d4-a716-446655440000";
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=${retryId}&${RETRY_ATTEMPT_PARAM}=3`);
    const state = getRetryStateFromUrl();
    expect(state?.retryId).toBe(retryId);
  });

  it("handles URL with path and other params", () => {
    setupMockLocation(
      `http://localhost/some/path?foo=bar&${RETRY_ID_PARAM}=test-id&${RETRY_ATTEMPT_PARAM}=1&baz=qux`,
    );
    const state = getRetryStateFromUrl();
    expect(state).toEqual({
      retryAttempt: 1,
      retryId: "test-id",
    });
  });

  it("returns null when window.location throws", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      get() {
        throw new Error("location unavailable");
      },
    });
    expect(getRetryStateFromUrl()).toBeNull();
  });
});

describe("updateRetryStateInUrl", () => {
  beforeEach(() => {
    setupMockLocation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets retryId and retryAttempt in URL via history.replaceState", () => {
    updateRetryStateInUrl("test-id", 1);
    expect(mockHistoryReplaceState).toHaveBeenCalledOnce();
    const calledUrl = new URL(mockHistoryReplaceState.mock.calls[0][2] as string);
    expect(calledUrl.searchParams.get(RETRY_ID_PARAM)).toBe("test-id");
    expect(calledUrl.searchParams.get(RETRY_ATTEMPT_PARAM)).toBe("1");
  });

  it("stores retryAttempt=0", () => {
    updateRetryStateInUrl("my-id", 0);
    expect(mockHistoryReplaceState).toHaveBeenCalledOnce();
    const calledUrl = new URL(mockHistoryReplaceState.mock.calls[0][2] as string);
    expect(calledUrl.searchParams.get(RETRY_ATTEMPT_PARAM)).toBe("0");
  });

  it("stores fallback state (retryAttempt=-1)", () => {
    updateRetryStateInUrl("my-id", -1);
    expect(mockHistoryReplaceState).toHaveBeenCalledOnce();
    const calledUrl = new URL(mockHistoryReplaceState.mock.calls[0][2] as string);
    expect(calledUrl.searchParams.get(RETRY_ATTEMPT_PARAM)).toBe("-1");
  });

  it("preserves existing URL params", () => {
    setupMockLocation("http://localhost/?foo=bar&baz=qux");
    updateRetryStateInUrl("id", 2);
    const calledUrl = new URL(mockHistoryReplaceState.mock.calls[0][2] as string);
    expect(calledUrl.searchParams.get("foo")).toBe("bar");
    expect(calledUrl.searchParams.get("baz")).toBe("qux");
  });

  it("overwrites existing retry params", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=old-id&${RETRY_ATTEMPT_PARAM}=1`);
    updateRetryStateInUrl("new-id", 2);
    const calledUrl = new URL(mockHistoryReplaceState.mock.calls[0][2] as string);
    expect(calledUrl.searchParams.get(RETRY_ID_PARAM)).toBe("new-id");
    expect(calledUrl.searchParams.get(RETRY_ATTEMPT_PARAM)).toBe("2");
  });

  it("does not throw when window.history.replaceState throws", () => {
    mockHistoryReplaceState.mockImplementation(() => {
      throw new Error("replaceState unavailable");
    });
    expect(() => updateRetryStateInUrl("id", 1)).not.toThrow();
  });
});

describe("clearRetryStateFromUrl", () => {
  beforeEach(() => {
    setupMockLocation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("removes retryId and retryAttempt params from URL", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=test-id&${RETRY_ATTEMPT_PARAM}=2`);
    clearRetryStateFromUrl();
    expect(mockHistoryReplaceState).toHaveBeenCalledOnce();
    const calledUrl = new URL(mockHistoryReplaceState.mock.calls[0][2] as string);
    expect(calledUrl.searchParams.has(RETRY_ID_PARAM)).toBe(false);
    expect(calledUrl.searchParams.has(RETRY_ATTEMPT_PARAM)).toBe(false);
  });

  it("preserves other URL params when clearing", () => {
    setupMockLocation(
      `http://localhost/?foo=bar&${RETRY_ID_PARAM}=id&${RETRY_ATTEMPT_PARAM}=1&baz=qux`,
    );
    clearRetryStateFromUrl();
    const calledUrl = new URL(mockHistoryReplaceState.mock.calls[0][2] as string);
    expect(calledUrl.searchParams.get("foo")).toBe("bar");
    expect(calledUrl.searchParams.get("baz")).toBe("qux");
  });

  it("does not throw when there are no retry params to remove", () => {
    setupMockLocation("http://localhost/");
    expect(() => clearRetryStateFromUrl()).not.toThrow();
  });

  it("does not throw when window.history.replaceState throws", () => {
    mockHistoryReplaceState.mockImplementation(() => {
      throw new Error("replaceState unavailable");
    });
    expect(() => clearRetryStateFromUrl()).not.toThrow();
  });
});

describe("generateRetryId", () => {
  it("returns a non-empty string", () => {
    const id = generateRetryId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique IDs on successive calls", () => {
    const id1 = generateRetryId();
    const id2 = generateRetryId();
    expect(id1).not.toBe(id2);
  });

  it("uses crypto.randomUUID when available", () => {
    const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: vi.fn().mockReturnValue(mockUUID) },
      writable: true,
    });
    const id = generateRetryId();
    expect(id).toBe(mockUUID);
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
      writable: true,
    });
  });

  it("falls back to getRandomValues when randomUUID unavailable", () => {
    const originalCrypto = globalThis.crypto;
    const mockGetRandomValues = vi.fn().mockImplementation((array: Uint32Array) => {
      array[0] = 123_456;
      array[1] = 789_012;
      return array;
    });
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: mockGetRandomValues },
      writable: true,
    });
    const id = generateRetryId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(mockGetRandomValues).toHaveBeenCalledOnce();
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
      writable: true,
    });
  });

  it("falls back to Date.now + Math.random when crypto unavailable", () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    const id = generateRetryId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
      writable: true,
    });
  });
});

describe("getRetryInfoForBeacon", () => {
  beforeEach(() => {
    setupMockLocation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty object when no retry state in URL", () => {
    setupMockLocation("http://localhost/");
    expect(getRetryInfoForBeacon()).toEqual({});
  });

  it("returns retryAttempt and retryId when retry state present", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=beacon-id&${RETRY_ATTEMPT_PARAM}=2`);
    expect(getRetryInfoForBeacon()).toEqual({
      retryAttempt: 2,
      retryId: "beacon-id",
    });
  });

  it("returns empty object when URL params are malformed", () => {
    setupMockLocation(
      `http://localhost/?${RETRY_ID_PARAM}=beacon-id&${RETRY_ATTEMPT_PARAM}=not-a-number`,
    );
    expect(getRetryInfoForBeacon()).toEqual({});
  });
});
