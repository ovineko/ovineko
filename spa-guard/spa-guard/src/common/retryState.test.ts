import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RETRY_ATTEMPT_PARAM, RETRY_ID_PARAM } from "./constants";
import {
  generateRetryId,
  getRetryAttemptFromUrl,
  getRetryInfoForBeacon,
  getRetryStateFromUrl,
} from "./retryState";

let mockLocationHref: string;
let mockLocationSearch: string;
let mockHistoryReplaceState: ReturnType<typeof vi.fn>;

const setupMockLocation = (url = "http://localhost/"): void => {
  mockLocationHref = url;
  const parsedUrl = new URL(url);
  mockLocationSearch = parsedUrl.search;
  mockHistoryReplaceState = vi.fn();

  Object.defineProperty(globalThis, "location", {
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

  Object.defineProperty(globalThis, "history", {
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

  it("returns null when retryAttempt is -1 (negative values no longer valid)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=my-id&${RETRY_ATTEMPT_PARAM}=-1`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null when retryAttempt is NaN", () => {
    setupMockLocation(
      `http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=not-a-number`,
    );
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null when retryAttempt is negative (invalid)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=-2`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null when retryAttempt is empty string", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null for lax integer with trailing text (1foo)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=1foo`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null for float-looking integer (1.5)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=1.5`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null for exponential notation (1e2)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=1e2`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("returns null for an astronomically large digit string that parseInt renders as Infinity", () => {
    const huge = "9".repeat(400);
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=${huge}`);
    expect(getRetryStateFromUrl()).toBeNull();
  });

  it("accepts retryAttempt=101 (no arbitrary upper bound)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=101`);
    const state = getRetryStateFromUrl();
    expect(state?.retryAttempt).toBe(101);
  });

  it("accepts retryAttempt=100", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc123&${RETRY_ATTEMPT_PARAM}=100`);
    const state = getRetryStateFromUrl();
    expect(state?.retryAttempt).toBe(100);
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
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      get() {
        throw new Error("location unavailable");
      },
    });
    expect(getRetryStateFromUrl()).toBeNull();
  });
});

describe("getRetryAttemptFromUrl", () => {
  beforeEach(() => {
    setupMockLocation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no retry attempt param present", () => {
    setupMockLocation("http://localhost/");
    expect(getRetryAttemptFromUrl()).toBeNull();
  });

  it("returns parsed number when retryAttempt param present", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=3`);
    expect(getRetryAttemptFromUrl()).toBe(3);
  });

  it("returns attempt even without retryId param", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=2`);
    expect(getRetryAttemptFromUrl()).toBe(2);
  });

  it("returns attempt when both params present", () => {
    setupMockLocation(`http://localhost/?${RETRY_ID_PARAM}=abc&${RETRY_ATTEMPT_PARAM}=5`);
    expect(getRetryAttemptFromUrl()).toBe(5);
  });

  it("parses retryAttempt=0 correctly", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=0`);
    expect(getRetryAttemptFromUrl()).toBe(0);
  });

  it("returns null when retryAttempt is NaN", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=not-a-number`);
    expect(getRetryAttemptFromUrl()).toBeNull();
  });

  it("returns null when retryAttempt is negative (invalid)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=-1`);
    expect(getRetryAttemptFromUrl()).toBeNull();
  });

  it("returns null when retryAttempt is empty string", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=`);
    expect(getRetryAttemptFromUrl()).toBeNull();
  });

  it("returns null for lax integer with trailing text (1foo)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=1foo`);
    expect(getRetryAttemptFromUrl()).toBeNull();
  });

  it("returns null for float-looking integer (1.5)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=1.5`);
    expect(getRetryAttemptFromUrl()).toBeNull();
  });

  it("returns null for an astronomically large digit string that parseInt renders as Infinity", () => {
    const huge = "9".repeat(400);
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=${huge}`);
    expect(getRetryAttemptFromUrl()).toBeNull();
  });

  it("accepts retryAttempt=101 (no arbitrary upper bound)", () => {
    setupMockLocation(`http://localhost/?${RETRY_ATTEMPT_PARAM}=101`);
    expect(getRetryAttemptFromUrl()).toBe(101);
  });

  it("handles URL with path and other params", () => {
    setupMockLocation(`http://localhost/some/path?foo=bar&${RETRY_ATTEMPT_PARAM}=1&baz=qux`);
    expect(getRetryAttemptFromUrl()).toBe(1);
  });

  it("returns null when window.location throws", () => {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      get() {
        throw new Error("location unavailable");
      },
    });
    expect(getRetryAttemptFromUrl()).toBeNull();
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
