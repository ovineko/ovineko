import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./events/internal", () => ({
  emitEvent: vi.fn(),
  getLogger: vi.fn(),
  isDefaultRetryEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock("./lastReloadTime", () => ({
  clearLastReloadTime: vi.fn(),
  clearLastRetryResetInfo: vi.fn(),
  getLastReloadTime: vi.fn(),
  setLastReloadTime: vi.fn(),
  setLastRetryResetInfo: vi.fn(),
  shouldResetRetryCycle: vi.fn(),
}));

vi.mock("./options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("./retryState", () => ({
  clearRetryAttemptFromUrl: vi.fn(),
  clearRetryStateFromUrl: vi.fn(),
  generateRetryId: vi.fn(),
  getRetryAttemptFromUrl: vi.fn(),
  getRetryStateFromUrl: vi.fn(),
  updateRetryStateInUrl: vi.fn(),
}));

vi.mock("./sendBeacon", () => ({
  sendBeacon: vi.fn(),
}));

vi.mock("./shouldIgnore", () => ({
  shouldIgnoreMessages: vi.fn(),
}));

import { emitEvent, getLogger } from "./events/internal";
import {
  clearLastReloadTime,
  getLastReloadTime,
  setLastReloadTime,
  setLastRetryResetInfo,
  shouldResetRetryCycle,
} from "./lastReloadTime";
import { getOptions } from "./options";
import { attemptReload, resetReloadScheduled } from "./reload";
import {
  clearRetryAttemptFromUrl,
  clearRetryStateFromUrl,
  generateRetryId,
  getRetryAttemptFromUrl,
  getRetryStateFromUrl,
  updateRetryStateInUrl,
} from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { shouldIgnoreMessages } from "./shouldIgnore";

const mockEmitEvent = vi.mocked(emitEvent);
const mockGetLogger = vi.mocked(getLogger);
const mockClearLastReloadTime = vi.mocked(clearLastReloadTime);
const mockGetLastReloadTime = vi.mocked(getLastReloadTime);
const mockSetLastReloadTime = vi.mocked(setLastReloadTime);
const mockSetLastRetryResetInfo = vi.mocked(setLastRetryResetInfo);
const mockShouldResetRetryCycle = vi.mocked(shouldResetRetryCycle);
const mockGetOptions = vi.mocked(getOptions);
const mockClearRetryAttemptFromUrl = vi.mocked(clearRetryAttemptFromUrl);
const mockClearRetryStateFromUrl = vi.mocked(clearRetryStateFromUrl);
const mockGenerateRetryId = vi.mocked(generateRetryId);
const mockGetRetryAttemptFromUrl = vi.mocked(getRetryAttemptFromUrl);
const mockGetRetryStateFromUrl = vi.mocked(getRetryStateFromUrl);
const mockUpdateRetryStateInUrl = vi.mocked(updateRetryStateInUrl);
const mockSendBeacon = vi.mocked(sendBeacon);
const mockShouldIgnoreMessages = vi.mocked(shouldIgnoreMessages);

const createMockLogger = () => ({
  beaconSendFailed: vi.fn(),
  capturedError: vi.fn(),
  clearingRetryState: vi.fn(),
  error: vi.fn(),
  fallbackAlreadyShown: vi.fn(),
  fallbackInjectFailed: vi.fn(),
  fallbackTargetNotFound: vi.fn(),
  log: vi.fn(),
  logEvent: vi.fn(),
  noBeaconEndpoint: vi.fn(),
  noFallbackConfigured: vi.fn(),
  reloadAlreadyScheduled: vi.fn(),
  retryCycleStarting: vi.fn(),
  retryLimitExceeded: vi.fn(),
  retrySchedulingReload: vi.fn(),
  updatedRetryAttempt: vi.fn(),
  versionChangeDetected: vi.fn(),
  versionCheckAlreadyRunning: vi.fn(),
  versionCheckDisabled: vi.fn(),
  versionCheckFailed: vi.fn(),
  versionCheckHttpError: vi.fn(),
  versionCheckParseError: vi.fn(),
  versionCheckPaused: vi.fn(),
  versionCheckRequiresEndpoint: vi.fn(),
  versionCheckResumed: vi.fn(),
  versionCheckResumedImmediate: vi.fn(),
  versionCheckStarted: vi.fn(),
  versionCheckStopped: vi.fn(),
  warn: vi.fn(),
});

const defaultOptions = {
  enableRetryReset: true,
  html: {
    fallback: {
      content: "<div>Fallback UI</div>",
      selector: "body",
    },
    loading: {
      content:
        '<div><div data-spa-guard-spinner></div><h2 data-spa-guard-content="loading">Loading...</h2><p data-spa-guard-section="retrying" style="display:none"><span data-spa-guard-content="retrying">Retry attempt</span> <span data-spa-guard-content="attempt"></span></p></div>',
    },
  },
  minTimeBetweenResets: 5000,
  reloadDelays: [1000, 2000, 5000],
  useRetryId: true,
};

let mockLocationHref: string;
let mockLocationSearch: string;
let mockLocationReload: ReturnType<typeof vi.fn>;

const setupMockLocation = (url = "http://localhost/"): void => {
  mockLocationHref = url;
  const parsedUrl = new URL(url);
  mockLocationSearch = parsedUrl.search;
  mockLocationReload = vi.fn();

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      get href() {
        return mockLocationHref;
      },
      set href(val: string) {
        mockLocationHref = val;
      },
      reload: mockLocationReload,
      search: mockLocationSearch,
    },
    writable: true,
  });
};

describe("attemptReload", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.useFakeTimers();
    setupMockLocation();
    resetReloadScheduled();
    mockLogger = createMockLogger();
    mockGetLogger.mockReturnValue(mockLogger);
    mockGetOptions.mockReturnValue(defaultOptions);
    mockGetRetryStateFromUrl.mockReturnValue(null);
    mockGetRetryAttemptFromUrl.mockReturnValue(null);
    mockGenerateRetryId.mockReturnValue("generated-retry-id");
    mockShouldResetRetryCycle.mockReturnValue(false);
    mockGetLastReloadTime.mockReturnValue(null);
    mockShouldIgnoreMessages.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    resetReloadScheduled();
  });

  describe("basic reload cycle - attempt 0", () => {
    it("emits retry-attempt event with attempt=1 and delay=1000 on first call", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        {
          attempt: 1,
          delay: 1000,
          name: "retry-attempt",
          retryId: "generated-retry-id",
        },
        { silent: false },
      );
    });

    it("generates a new retryId when no retry state in URL", () => {
      mockGetRetryStateFromUrl.mockReturnValue(null);
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockGenerateRetryId).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ retryId: "generated-retry-id" }),
        { silent: false },
      );
    });

    it("sets window.location.href after the delay when useRetryId=true", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockLocationHref).toBe("http://localhost/");
      vi.advanceTimersByTime(1000);

      expect(mockLocationHref).toContain("spaGuardRetryId=generated-retry-id");
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=1");
    });

    it("calls setLastReloadTime with retryId and attempt=1 before navigating", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockSetLastReloadTime).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(mockSetLastReloadTime).toHaveBeenCalledWith("generated-retry-id", 1);
    });

    it("uses first delay from reloadDelays for first attempt", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, reloadDelays: [500, 1500, 3000] });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 500 }), {
        silent: false,
      });

      expect(mockLocationHref).toBe("http://localhost/");
      vi.advanceTimersByTime(500);

      expect(mockLocationHref).toContain("spaGuardRetryAttempt=1");
    });

    it("does not navigate before the delay expires", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(999);

      expect(mockLocationHref).toBe("http://localhost/");
    });
  });

  describe("retry attempt count in URL", () => {
    it("uses current attempt from URL state and increments to next attempt", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 1, retryId: "existing-id" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 2, name: "retry-attempt", retryId: "existing-id" }),
        { silent: false },
      );
    });

    it("preserves retryId from URL when retrying", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 1, retryId: "url-retry-id" });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(2000);

      expect(mockLocationHref).toContain("spaGuardRetryId=url-retry-id");
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=2");
    });

    it("does not call generateRetryId when retry state exists in URL", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 1, retryId: "url-retry-id" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockGenerateRetryId).not.toHaveBeenCalled();
    });

    it("uses second delay for second attempt", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 1, retryId: "r1" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 2000 }), {
        silent: false,
      });
    });

    it("uses third delay for third attempt", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "r1" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 5000 }), {
        silent: false,
      });
    });
  });

  describe("useRetryId=false - uses attempt-only URL params", () => {
    it("sets location.href with spaGuardRetryAttempt param when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(1000);

      expect(mockLocationHref).toContain("spaGuardRetryAttempt=1");
      expect(mockLocationHref).not.toContain("spaGuardRetryId");
    });

    it("does not call setLastReloadTime when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(1000);

      expect(mockSetLastReloadTime).not.toHaveBeenCalled();
    });

    it("does not read full retry state from URL when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockGetRetryStateFromUrl).not.toHaveBeenCalled();
    });

    it("reads attempt from URL via getRetryAttemptFromUrl when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockGetRetryAttemptFromUrl).toHaveBeenCalledTimes(1);
    });

    it("increments attempt from URL when useRetryId=false and attempt exists", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      mockGetRetryAttemptFromUrl.mockReturnValue(1);

      attemptReload(new Error("chunk error"));

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 2, name: "retry-attempt" }),
        { silent: false },
      );

      vi.advanceTimersByTime(2000);

      expect(mockLocationHref).toContain("spaGuardRetryAttempt=2");
      expect(mockLocationHref).not.toContain("spaGuardRetryId");
    });

    it("successive reloads with useRetryId=false increment attempt via URL param and reach exhaustion", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });

      // First reload - no attempt in URL
      mockGetRetryAttemptFromUrl.mockReturnValue(null);
      attemptReload(new Error("chunk error"));
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt" }),
        { silent: false },
      );
      vi.advanceTimersByTime(1000);
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=1");

      // Second reload - attempt=1 in URL
      resetReloadScheduled();
      mockEmitEvent.mockClear();
      mockGetRetryAttemptFromUrl.mockReturnValue(1);
      attemptReload(new Error("chunk error"));
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 2, name: "retry-attempt" }),
        { silent: false },
      );
      vi.advanceTimersByTime(2000);
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=2");

      // Third reload - attempt=2 in URL
      resetReloadScheduled();
      mockEmitEvent.mockClear();
      mockGetRetryAttemptFromUrl.mockReturnValue(2);
      attemptReload(new Error("chunk error"));
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 3, name: "retry-attempt" }),
        { silent: false },
      );
      vi.advanceTimersByTime(5000);
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=3");

      // Fourth reload - attempt=3 in URL, should be exhausted (reloadDelays has 3 entries)
      resetReloadScheduled();
      mockEmitEvent.mockClear();
      mockGetRetryAttemptFromUrl.mockReturnValue(3);
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("chunk error"));

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ finalAttempt: 3, name: "retry-exhausted" }),
        { silent: false },
      );
    });

    it("clears attempt param from URL on exhaustion when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      mockGetRetryAttemptFromUrl.mockReturnValue(3);
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("chunk error"));

      // Called in both the exhaustion path and showFallbackUI (idempotent)
      expect(mockClearRetryAttemptFromUrl).toHaveBeenCalled();
    });

    it("does not put spaGuardRetryId in URL when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(1000);

      expect(mockLocationHref).not.toContain("spaGuardRetryId");
    });
  });

  describe("max attempts exceeded → fallback shown", () => {
    it("emits retry-exhausted event when attempt >= reloadDelays.length", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ finalAttempt: 3, name: "retry-exhausted", retryId: "r1" }),
        { silent: false },
      );
    });

    it("calls sendBeacon when max attempts exceeded", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "chunk_error_max_reloads" }),
      );
    });

    it("sendBeacon payload includes retryAttempt and retryId", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "exhausted-id" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAttempt: 3,
          retryId: "exhausted-id",
        }),
      );
    });

    it("does not call window.location.reload or set href when max attempts exceeded", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const error = new Error("chunk error");

      // Mock document.querySelector to avoid DOM errors in fallback UI
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      attemptReload(error);

      vi.advanceTimersByTime(5000);

      expect(mockLocationReload).not.toHaveBeenCalled();
      expect(mockLocationHref).toBe("http://localhost/");
    });

    it("does not emit retry-attempt event when max attempts exceeded", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const error = new Error("chunk error");

      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      attemptReload(error);

      const retryAttemptCalls = mockEmitEvent.mock.calls.filter(
        (call) => call[0]?.name === "retry-attempt",
      );
      expect(retryAttemptCalls).toHaveLength(0);
    });
  });

  describe("fallback already shown (attempt=-1)", () => {
    it("calls showFallbackUI (injects HTML) and returns when attempt=-1", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEl.innerHTML).toBe("<div>Fallback UI</div>");
    });

    it("emits chunk-error with isRetrying=false when attempt=-1", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ isRetrying: false, name: "chunk-error" }),
      );
    });

    it("does not emit retry-attempt or retry-exhausted when attempt=-1", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      const eventNames = mockEmitEvent.mock.calls.map((call) => call[0]?.name);
      expect(eventNames).not.toContain("retry-attempt");
      expect(eventNames).not.toContain("retry-exhausted");
    });

    it("does not navigate when attempt=-1", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(10_000);

      expect(mockLocationReload).not.toHaveBeenCalled();
      expect(mockLocationHref).toBe("http://localhost/");
    });
  });

  describe("retry reset logic", () => {
    it("resets attempt to 0 and generates new retryId when shouldResetRetryCycle returns true", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });
      mockGenerateRetryId.mockReturnValue("new-retry-id");

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "retry-reset",
          previousAttempt: 2,
          previousRetryId: "old-id",
        }),
        { silent: false },
      );

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt", retryId: "new-retry-id" }),
        { silent: false },
      );
    });

    it("calls clearRetryStateFromUrl and clearLastReloadTime on reset", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockClearRetryStateFromUrl).toHaveBeenCalledTimes(1);
      expect(mockClearLastReloadTime).toHaveBeenCalledTimes(1);
    });

    it("calls setLastRetryResetInfo with previous retryId on reset", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockSetLastRetryResetInfo).toHaveBeenCalledWith("old-id");
    });

    it("does not reset when enableRetryReset=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, enableRetryReset: false });
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset" }),
      );
    });

    it("does not reset when retry attempt is 0", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 0, retryId: "id" });
      mockShouldResetRetryCycle.mockReturnValue(false);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset" }),
      );
    });

    it("does not reset when retryState is null", () => {
      mockGetRetryStateFromUrl.mockReturnValue(null);
      mockShouldResetRetryCycle.mockReturnValue(true);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset" }),
      );
    });

    it("emits retry-reset with timeSinceReload calculated from lastReloadTime", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: now - 7000,
      });

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset", timeSinceReload: 7000 }),
        { silent: false },
      );
    });

    it("emits timeSinceReload=0 when no lastReloadTime is available", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue(null);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset", timeSinceReload: 0 }),
        { silent: false },
      );
    });
  });

  describe("fallback HTML injection (showFallbackUI)", () => {
    it("injects fallbackHtml into the target element matching selector", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(document.querySelector).toHaveBeenCalledWith("body");
      expect(mockEl.innerHTML).toBe("<div>Fallback UI</div>");
    });

    it("uses custom selector from fallback options", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        html: { fallback: { content: "<div>Custom</div>", selector: "#app" } },
      });
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(document.querySelector).toHaveBeenCalledWith("#app");
      expect(mockEl.innerHTML).toBe("<div>Custom</div>");
    });

    it("emits fallback-ui-shown event after injecting fallback HTML", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("does not inject fallback HTML or emit event when no fallback html configured", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        html: { fallback: { selector: "body" } },
      });
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      vi.spyOn(document, "querySelector");

      const error = new Error("chunk error");

      attemptReload(error);

      expect(document.querySelector).not.toHaveBeenCalled();
      expect(mockEmitEvent).not.toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("does not inject when target element is not found", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      const error = new Error("chunk error");

      expect(() => attemptReload(error)).not.toThrow();
      expect(mockEmitEvent).not.toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("does not increment retry state in URL when fallback is shown with exhausted retries", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockUpdateRetryStateInUrl).not.toHaveBeenCalled();
    });

    it("clears retry state from URL when fallback is shown with attempt=-1 state", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockClearRetryStateFromUrl).toHaveBeenCalledTimes(1);
      expect(mockUpdateRetryStateInUrl).not.toHaveBeenCalled();
    });
  });

  describe("event emissions", () => {
    it("emits chunk-error then retry-attempt on a normal retry attempt", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledTimes(2);
      const eventNames = mockEmitEvent.mock.calls.map((call) => call[0]?.name);
      expect(eventNames[0]).toBe("chunk-error");
      expect(eventNames[1]).toBe("retry-attempt");
    });

    it("emits chunk-error then retry-reset then retry-attempt when reset occurs", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });
      mockGenerateRetryId.mockReturnValue("new-id");

      const error = new Error("chunk error");

      attemptReload(error);

      const eventNames = mockEmitEvent.mock.calls.map((call) => call[0]?.name);
      expect(eventNames[0]).toBe("chunk-error");
      expect(eventNames[1]).toBe("retry-reset");
      expect(eventNames[2]).toBe("retry-attempt");
    });

    it("emits retry-exhausted before fallback-ui-shown when max attempts exceeded", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      const error = new Error("chunk error");

      attemptReload(error);

      const eventNames = mockEmitEvent.mock.calls.map((call) => call[0]?.name);
      const exhaustedIdx = eventNames.indexOf("retry-exhausted");
      const fallbackIdx = eventNames.indexOf("fallback-ui-shown");
      expect(exhaustedIdx).toBeGreaterThanOrEqual(0);
      expect(fallbackIdx).toBeGreaterThan(exhaustedIdx);
    });
  });

  describe("edge cases", () => {
    it("handles empty reloadDelays array by showing fallback immediately", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, reloadDelays: [] });
      mockGetRetryStateFromUrl.mockReturnValue(null);
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-exhausted" }),
        { silent: false },
      );
    });

    it("handles null error value without throwing", () => {
      expect(() => attemptReload(null)).not.toThrow();
    });

    it("handles undefined error value without throwing", () => {
      const errorValue: unknown = undefined;
      expect(() => attemptReload(errorValue)).not.toThrow();
    });

    it("handles non-Error object without throwing", () => {
      expect(() => attemptReload({ code: 500 })).not.toThrow();
    });

    it("handles string error value without throwing", () => {
      expect(() => attemptReload("some error string")).not.toThrow();
    });

    it("uses 1000ms fallback delay when reloadDelays entry is undefined", () => {
      // This can happen if reloadDelays array is somehow sparse
      mockGetOptions.mockReturnValue({ ...defaultOptions, reloadDelays: [undefined as any] });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 1000 }), {
        silent: false,
      });
    });

    it("does not call setLastReloadTime when useRetryId=true but enableRetryReset=false", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        enableRetryReset: false,
        useRetryId: true,
      });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(1000);

      expect(mockSetLastReloadTime).not.toHaveBeenCalled();
    });

    it("still sets window.location.href even when enableRetryReset=false", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        enableRetryReset: false,
        useRetryId: true,
      });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(1000);

      expect(mockLocationHref).toContain("spaGuardRetryId=generated-retry-id");
    });

    it("sendBeacon payload for retry-exhausted includes serialized error info", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const error = new Error("some chunk load error");
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      attemptReload(error);

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Exceeded maximum reload attempts",
          serialized: expect.stringContaining("Error: some chunk load error"),
        }),
      );
    });

    it("does not throw when querySelector throws an error", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      vi.spyOn(document, "querySelector").mockImplementation(() => {
        throw new Error("querySelector failed");
      });

      const error = new Error("chunk error");

      expect(() => attemptReload(error)).not.toThrow();
    });
  });

  describe("shouldIgnore suppresses event logging via silent flag", () => {
    it("passes silent: true to retry-reset emitEvent when shouldIgnoreMessages returns true", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "old-id" });
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });
      mockShouldIgnoreMessages.mockReturnValue(true);

      attemptReload(new Error("ignored error"));

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "retry-reset" }), {
        silent: true,
      });
    });

    it("passes silent: true to retry-exhausted emitEvent when shouldIgnoreMessages returns true", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      mockShouldIgnoreMessages.mockReturnValue(true);
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("ignored error"));

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-exhausted" }),
        { silent: true },
      );
    });

    it("passes silent: true to retry-attempt emitEvent when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);

      attemptReload(new Error("ignored error"));

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-attempt" }),
        { silent: true },
      );
    });

    it("passes silent: false to emitEvent when shouldIgnoreMessages returns false", () => {
      mockShouldIgnoreMessages.mockReturnValue(false);

      attemptReload(new Error("normal error"));

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-attempt" }),
        { silent: false },
      );
    });
  });

  describe("Logger method calls", () => {
    it("calls fallbackAlreadyShown when attempt is -1 and not ignored", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockLogger.fallbackAlreadyShown).toHaveBeenCalledWith(error);
    });

    it("does not call fallbackAlreadyShown when error is ignored", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      mockShouldIgnoreMessages.mockReturnValue(true);
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("ignored"));

      expect(mockLogger.fallbackAlreadyShown).not.toHaveBeenCalled();
    });

    it("calls noFallbackConfigured when no fallback HTML is set", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        html: { fallback: { selector: "body" } },
      });
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });

      attemptReload(new Error("chunk error"));

      expect(mockLogger.noFallbackConfigured).toHaveBeenCalledTimes(1);
    });

    it("calls fallbackTargetNotFound when target element is not found", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      vi.spyOn(document, "querySelector").mockReturnValue(null);

      attemptReload(new Error("chunk error"));

      expect(mockLogger.fallbackTargetNotFound).toHaveBeenCalledWith("body");
    });

    it("calls clearingRetryState when showing fallback with attempt=-1", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("chunk error"));

      expect(mockLogger.clearingRetryState).toHaveBeenCalledTimes(1);
    });

    it("does not call updatedRetryAttempt when showing fallback with exhausted retries", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("chunk error"));

      expect(mockLogger.updatedRetryAttempt).not.toHaveBeenCalled();
    });

    it("calls fallbackInjectFailed when querySelector throws", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const querySelectorError = new Error("querySelector failed");
      vi.spyOn(document, "querySelector").mockImplementation(() => {
        throw querySelectorError;
      });

      attemptReload(new Error("chunk error"));

      expect(mockLogger.fallbackInjectFailed).toHaveBeenCalledWith(querySelectorError);
    });

    it("does not call Logger methods when no logger is set", () => {
      mockGetLogger.mockReturnValue();
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      expect(() => attemptReload(new Error("chunk error"))).not.toThrow();
    });

    it("calls retryCycleStarting with retryId and current attempt", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockLogger.retryCycleStarting).toHaveBeenCalledWith("generated-retry-id", 0);
    });

    it("calls retrySchedulingReload before scheduling the reload timeout", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockLogger.retrySchedulingReload).toHaveBeenCalledWith("generated-retry-id", 1, 1000);
    });
  });

  describe("reload deduplication guard", () => {
    it("ignores second attemptReload call while a reload is already scheduled", () => {
      const error1 = new Error("first chunk error");
      const error2 = new Error("second chunk error");

      attemptReload(error1);

      // First call emits chunk-error + retry-attempt = 2 events
      expect(mockEmitEvent).toHaveBeenCalledTimes(2);

      attemptReload(error2);

      // Second call should be a no-op, no additional events emitted
      expect(mockEmitEvent).toHaveBeenCalledTimes(2);
    });

    it("calls reloadAlreadyScheduled logger method on duplicate call", () => {
      const error1 = new Error("first chunk error");
      const error2 = new Error("second chunk error");

      attemptReload(error1);
      attemptReload(error2);

      expect(mockLogger.reloadAlreadyScheduled).toHaveBeenCalledWith(error2);
    });

    it("allows new attemptReload after resetReloadScheduled is called", () => {
      const error1 = new Error("first chunk error");
      const error2 = new Error("second chunk error");

      attemptReload(error1);
      expect(mockEmitEvent).toHaveBeenCalledTimes(2);

      resetReloadScheduled();

      attemptReload(error2);
      // Should emit 2 more events (chunk-error + retry-attempt)
      expect(mockEmitEvent).toHaveBeenCalledTimes(4);
    });

    it("does not set reloadScheduled flag when fallback is shown (attempt=-1)", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("first error"));

      // Should still allow subsequent calls since no reload was scheduled
      mockEmitEvent.mockClear();
      mockGetRetryStateFromUrl.mockReturnValue(null);

      attemptReload(new Error("second error"));

      // Should emit events for the second call
      expect(mockEmitEvent).toHaveBeenCalled();
    });

    it("prevents re-entrant calls when a subscriber calls attemptReload during chunk-error emission", () => {
      // Simulate a subscriber that re-enters attemptReload during the chunk-error event
      mockEmitEvent.mockImplementationOnce(() => {
        // This recursive call should be blocked by the re-entrant guard
        attemptReload(new Error("reentrant error"));
      });

      attemptReload(new Error("original error"));

      // The reentrant call should have been blocked - reloadAlreadyScheduled should be called
      expect(mockLogger.reloadAlreadyScheduled).toHaveBeenCalledWith(new Error("reentrant error"));
    });

    it("resets reloadScheduled when emitEvent throws an exception", () => {
      mockEmitEvent.mockImplementationOnce(() => {
        throw new Error("logger exploded");
      });

      // First call throws internally but should reset reloadScheduled
      attemptReload(new Error("chunk error"));

      // Second call should NOT be blocked by reloadAlreadyScheduled
      mockEmitEvent.mockClear();
      attemptReload(new Error("second error"));

      expect(mockEmitEvent).toHaveBeenCalled();
      expect(mockLogger.reloadAlreadyScheduled).not.toHaveBeenCalled();
    });

    it("resets reloadScheduled when logger.retryCycleStarting throws", () => {
      mockLogger.retryCycleStarting.mockImplementationOnce(() => {
        throw new Error("logger method threw");
      });

      attemptReload(new Error("chunk error"));

      // Should recover and allow subsequent calls
      attemptReload(new Error("second error"));

      expect(mockEmitEvent).toHaveBeenCalled();
      expect(mockLogger.reloadAlreadyScheduled).not.toHaveBeenCalled();
    });

    it("does not set reloadScheduled flag when retries are exhausted", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "", querySelector: () => null };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      attemptReload(new Error("first error"));

      // Should still allow subsequent calls since no reload was scheduled
      mockEmitEvent.mockClear();
      mockGetRetryStateFromUrl.mockReturnValue(null);

      attemptReload(new Error("second error"));

      expect(mockEmitEvent).toHaveBeenCalled();
    });
  });

  describe("showLoadingUI during retry delays", () => {
    it("renders loading template to the fallback selector during retry", () => {
      const mockEl = { innerHTML: "", querySelector: vi.fn(() => null) };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEl.innerHTML).toContain("Loading...");
    });

    it("shows retrying section with attempt number", () => {
      const mockEl = { innerHTML: "", querySelector: vi.fn(() => null) };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      const error = new Error("chunk error");

      attemptReload(error);

      // First retry attempt = 1
      expect(mockEl.innerHTML).toContain("Retry attempt");
    });

    it("injects spinner content from options into data-spa-guard-spinner", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        spinner: { content: "<div>Custom Spin</div>", disabled: false },
      });
      const mockEl = { innerHTML: "", querySelector: vi.fn(() => null) };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      attemptReload(new Error("chunk error"));

      expect(mockEl.innerHTML).toContain("Custom Spin");
    });

    it("does not render loading UI when no loading html configured", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        html: { fallback: defaultOptions.html.fallback },
      });
      const error = new Error("chunk error");

      // Should not throw even when loading HTML is missing
      expect(() => attemptReload(error)).not.toThrow();
    });

    it("does not render loading UI when target element not found", () => {
      vi.spyOn(document, "querySelector").mockReturnValue(null);
      const error = new Error("chunk error");

      expect(() => attemptReload(error)).not.toThrow();
    });
  });
});
