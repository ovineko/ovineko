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
  generateRetryId: vi.fn(),
}));

vi.mock("./sendBeacon", () => ({
  sendBeacon: vi.fn(),
}));

vi.mock("./shouldIgnore", () => ({
  shouldIgnoreMessages: vi.fn(),
}));

vi.mock("./fallbackRendering", () => ({
  showFallbackUI: vi.fn(),
  showLoadingUI: vi.fn(),
}));

vi.mock("./fallbackState", () => ({
  isInFallbackMode: vi.fn().mockReturnValue(false),
  resetFallbackMode: vi.fn(),
  setFallbackMode: vi.fn(),
}));

import { emitEvent, getLogger, isDefaultRetryEnabled } from "./events/internal";
import { showFallbackUI } from "./fallbackRendering";
import { isInFallbackMode, resetFallbackMode, setFallbackMode } from "./fallbackState";
import {
  clearLastReloadTime,
  clearLastRetryResetInfo,
  getLastReloadTime,
  setLastReloadTime,
  setLastRetryResetInfo,
  shouldResetRetryCycle,
} from "./lastReloadTime";
import { getOptions } from "./options";
import {
  getRetrySnapshot,
  markRetryHealthyBoot,
  resetRetryOrchestratorForTests,
  setFallbackStateForDebug,
  triggerRetry,
} from "./retryOrchestrator";
import { generateRetryId } from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { shouldIgnoreMessages } from "./shouldIgnore";

const mockEmitEvent = vi.mocked(emitEvent);
const mockGetLogger = vi.mocked(getLogger);
const mockIsDefaultRetryEnabled = vi.mocked(isDefaultRetryEnabled);
const mockClearLastReloadTime = vi.mocked(clearLastReloadTime);
const mockClearLastRetryResetInfo = vi.mocked(clearLastRetryResetInfo);
const mockGetLastReloadTime = vi.mocked(getLastReloadTime);
const mockSetLastReloadTime = vi.mocked(setLastReloadTime);
const mockSetLastRetryResetInfo = vi.mocked(setLastRetryResetInfo);
const mockShouldResetRetryCycle = vi.mocked(shouldResetRetryCycle);
const mockGetOptions = vi.mocked(getOptions);
const mockGenerateRetryId = vi.mocked(generateRetryId);
const mockSendBeacon = vi.mocked(sendBeacon);
const mockShouldIgnoreMessages = vi.mocked(shouldIgnoreMessages);
const mockShowFallbackUI = vi.mocked(showFallbackUI);
const mockIsInFallbackMode = vi.mocked(isInFallbackMode);
const mockResetFallbackMode = vi.mocked(resetFallbackMode);
const mockSetFallbackMode = vi.mocked(setFallbackMode);

const createMockLogger = () => ({
  beaconSendFailed: vi.fn(),
  capturedError: vi.fn(),
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
  retrySchedulingReload: vi.fn(),
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
  minTimeBetweenResets: 5000,
  reloadDelays: [1000, 2000, 5000],
  useRetryId: true,
};

let mockLocationHref: string;

const setupMockLocation = (url = "http://localhost/"): void => {
  mockLocationHref = url;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      ...globalThis.window,
      history: {
        replaceState: vi.fn(),
      },
      location: {
        get href() {
          return mockLocationHref;
        },
        set href(val: string) {
          mockLocationHref = val;
        },
        get search() {
          return new URL(mockLocationHref).search;
        },
      },
    },
    writable: true,
  });
};

describe("retryOrchestrator", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    vi.useFakeTimers();
    setupMockLocation();
    resetRetryOrchestratorForTests();
    mockLogger = createMockLogger();
    mockGetLogger.mockReturnValue(mockLogger);
    mockGetOptions.mockReturnValue(defaultOptions);
    mockGenerateRetryId.mockReturnValue("generated-retry-id");
    mockShouldResetRetryCycle.mockReturnValue(false);
    mockGetLastReloadTime.mockReturnValue(null);
    mockShouldIgnoreMessages.mockReturnValue(false);
    mockIsInFallbackMode.mockReturnValue(false);
    mockIsDefaultRetryEnabled.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    resetRetryOrchestratorForTests();
  });

  describe("triggerRetry - basic retry scheduling", () => {
    it("returns accepted on first trigger", () => {
      const result = triggerRetry({ error: new Error("chunk error") });
      expect(result).toEqual({ status: "accepted" });
    });

    it("transitions phase from idle to scheduled", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().phase).toBe("scheduled");
    });

    it("emits chunk-error event with isRetrying=true", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ isRetrying: true, name: "chunk-error" }),
      );
    });

    it("emits retry-attempt event with attempt=1 and delay=1000", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 1,
          delay: 1000,
          name: "retry-attempt",
          retryId: "generated-retry-id",
        }),
        { silent: false },
      );
    });

    it("navigates to reload URL after delay", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(mockLocationHref).toBe("http://localhost/");
      vi.advanceTimersByTime(1000);
      expect(mockLocationHref).toContain("spaGuardRetryId=generated-retry-id");
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=1");
    });

    it("does not navigate before delay expires", () => {
      triggerRetry({ error: new Error("chunk error") });
      vi.advanceTimersByTime(999);
      expect(mockLocationHref).toBe("http://localhost/");
    });

    it("calls setLastReloadTime with retryId and attempt before navigating", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(mockSetLastReloadTime).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(mockSetLastReloadTime).toHaveBeenCalledWith("generated-retry-id", 1);
    });

    it("uses second delay for attempt 1 from URL", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=existing-id&spaGuardRetryAttempt=1");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 2000, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("uses third delay for attempt 2 from URL", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=existing-id&spaGuardRetryAttempt=2");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 5000, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("preserves retryId from URL", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=url-retry-id&spaGuardRetryAttempt=1");
      triggerRetry({ error: new Error("chunk error") });
      vi.advanceTimersByTime(2000);
      expect(mockLocationHref).toContain("spaGuardRetryId=url-retry-id");
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=2");
    });

    it("does not call generateRetryId when retryId exists in URL with useRetryId=true", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=url-id&spaGuardRetryAttempt=1");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockGenerateRetryId).not.toHaveBeenCalled();
    });

    it("stores source in snapshot", () => {
      triggerRetry({ error: new Error("chunk error"), source: "test-source" });
      expect(getRetrySnapshot().lastSource).toBe("test-source");
    });
  });

  describe("triggerRetry - dedupe", () => {
    it("returns deduped when phase is scheduled", () => {
      triggerRetry({ error: new Error("first") });
      const result = triggerRetry({ error: new Error("second") });
      expect(result).toEqual({ reason: "already-scheduled", status: "deduped" });
    });

    it("does not emit additional events on deduped trigger", () => {
      triggerRetry({ error: new Error("first") });
      const callsBefore = mockEmitEvent.mock.calls.length;
      triggerRetry({ error: new Error("second") });
      expect(mockEmitEvent.mock.calls.length).toBe(callsBefore);
    });

    it("calls reloadAlreadyScheduled logger on deduped trigger", () => {
      const e1 = new Error("first");
      const e2 = new Error("second");
      triggerRetry({ error: e1 });
      triggerRetry({ error: e2 });
      expect(mockLogger.reloadAlreadyScheduled).toHaveBeenCalledWith(e2);
    });

    it("allows new trigger after resetRetryOrchestratorForTests", () => {
      triggerRetry({ error: new Error("first") });
      resetRetryOrchestratorForTests();
      const result = triggerRetry({ error: new Error("second") });
      expect(result).toEqual({ status: "accepted" });
    });

    it("20 rapid triggers produce exactly 1 scheduled reload", () => {
      for (let i = 0; i < 20; i++) {
        triggerRetry({ error: new Error(`error ${i}`) });
      }
      vi.advanceTimersByTime(1000);
      // Only one navigation should happen (only one URL change)
      const url = new URL(mockLocationHref);
      expect(url.searchParams.get("spaGuardRetryAttempt")).toBe("1");
    });

    it("prevents re-entrant triggers when subscriber calls triggerRetry during emit", () => {
      mockEmitEvent.mockImplementationOnce(() => {
        triggerRetry({ error: new Error("reentrant") });
      });
      triggerRetry({ error: new Error("original") });
      expect(mockLogger.reloadAlreadyScheduled).toHaveBeenCalledWith(new Error("reentrant"));
    });
  });

  describe("triggerRetry - fallback guard", () => {
    it("returns fallback when phase is fallback", () => {
      // Exhaust attempts
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      resetRetryOrchestratorForTests();
      // Now simulate fallback mode from window
      mockIsInFallbackMode.mockReturnValue(true);
      const result = triggerRetry({ error: new Error("after fallback") });
      expect(result).toEqual({ status: "fallback" });
    });

    it("returns fallback when isInFallbackMode returns true", () => {
      mockIsInFallbackMode.mockReturnValue(true);
      const result = triggerRetry({ error: new Error("chunk error") });
      expect(result).toEqual({ status: "fallback" });
    });

    it("calls fallbackAlreadyShown logger when in fallback mode", () => {
      mockIsInFallbackMode.mockReturnValue(true);
      const error = new Error("chunk error");
      triggerRetry({ error });
      expect(mockLogger.fallbackAlreadyShown).toHaveBeenCalledWith(error);
    });

    it("does not emit events when in fallback mode", () => {
      mockIsInFallbackMode.mockReturnValue(true);
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).not.toHaveBeenCalled();
    });
  });

  describe("triggerRetry - retry disabled", () => {
    it("returns retry-disabled when isDefaultRetryEnabled returns false", () => {
      mockIsDefaultRetryEnabled.mockReturnValue(false);
      const result = triggerRetry({ error: new Error("chunk error") });
      expect(result).toEqual({ status: "retry-disabled" });
    });

    it("does not emit events when retry is disabled", () => {
      mockIsDefaultRetryEnabled.mockReturnValue(false);
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).not.toHaveBeenCalled();
    });
  });

  describe("triggerRetry - fallback transition (exhausted)", () => {
    it("returns fallback when all attempts exhausted", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      const result = triggerRetry({ error: new Error("chunk error") });
      expect(result).toEqual({ status: "fallback" });
    });

    it("transitions phase to fallback when exhausted", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().phase).toBe("fallback");
    });

    it("calls setFallbackMode when exhausted", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockSetFallbackMode).toHaveBeenCalled();
    });

    it("calls showFallbackUI when exhausted", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockShowFallbackUI).toHaveBeenCalledTimes(1);
    });

    it("calls showFallbackUI after setFallbackMode (lifecycle before rendering)", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      const order: string[] = [];
      mockSetFallbackMode.mockImplementation(() => order.push("setFallbackMode"));
      mockShowFallbackUI.mockImplementation(() => order.push("showFallbackUI"));

      triggerRetry({ error: new Error("chunk error") });

      expect(order).toEqual(["setFallbackMode", "showFallbackUI"]);
    });

    it("does not call showFallbackUI on normal retry scheduling", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(mockShowFallbackUI).not.toHaveBeenCalled();
    });

    it("emits retry-exhausted event when exhausted", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=r1&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ finalAttempt: 3, name: "retry-exhausted", retryId: "r1" }),
        { silent: false },
      );
    });

    it("sends beacon when exhausted", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=r1&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "chunk_error_max_reloads",
          retryAttempt: 3,
          retryId: "r1",
        }),
      );
    });

    it("does not navigate when exhausted", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      vi.advanceTimersByTime(10_000);
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=3");
      // No new navigation was triggered
      const url = new URL(mockLocationHref);
      expect(url.searchParams.get("spaGuardRetryAttempt")).toBe("3");
    });

    it("shows fallback immediately when reloadDelays is empty", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, reloadDelays: [] });
      const result = triggerRetry({ error: new Error("chunk error") });
      expect(result).toEqual({ status: "fallback" });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-exhausted" }),
        { silent: false },
      );
    });

    it("subsequent triggers return fallback after exhaustion", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      // Mock fallback mode for subsequent call
      mockIsInFallbackMode.mockReturnValue(true);
      const result = triggerRetry({ error: new Error("chunk error 2") });
      expect(result).toEqual({ status: "fallback" });
    });
  });

  describe("triggerRetry - cacheBust option", () => {
    it("appends spaGuardCacheBust param to reload URL when cacheBust=true", () => {
      triggerRetry({ cacheBust: true, error: new Error("chunk error") });
      vi.advanceTimersByTime(1000);
      expect(mockLocationHref).toContain("spaGuardCacheBust=");
    });

    it("does not append spaGuardCacheBust when cacheBust is not set", () => {
      triggerRetry({ error: new Error("chunk error") });
      vi.advanceTimersByTime(1000);
      expect(mockLocationHref).not.toContain("spaGuardCacheBust");
    });
  });

  describe("triggerRetry - retry reset logic", () => {
    it("resets attempt to 0 and generates new retryId when shouldResetRetryCycle returns true", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=2");
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });
      mockGenerateRetryId.mockReturnValue("new-retry-id");

      triggerRetry({ error: new Error("chunk error") });

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

    it("calls clearLastReloadTime on reset", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=2");
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });
      triggerRetry({ error: new Error("chunk error") });
      expect(mockClearLastReloadTime).toHaveBeenCalledTimes(1);
    });

    it("calls setLastRetryResetInfo with previous retryId on reset", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=2");
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });
      triggerRetry({ error: new Error("chunk error") });
      expect(mockSetLastRetryResetInfo).toHaveBeenCalledWith("old-id");
    });

    it("does not reset when enableRetryReset=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, enableRetryReset: false });
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=2");
      mockShouldResetRetryCycle.mockReturnValue(true);
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset" }),
      );
    });

    it("does not reset when urlAttempt is 0", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=0");
      mockShouldResetRetryCycle.mockReturnValue(true);
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset" }),
      );
    });

    it("does not reset when no URL retry state", () => {
      mockShouldResetRetryCycle.mockReturnValue(true);
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset" }),
      );
    });

    it("emits retry-reset with timeSinceReload calculated from lastReloadTime", () => {
      const now = Date.now();
      vi.setSystemTime(now);
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=2");
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: now - 7000,
      });
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset", timeSinceReload: 7000 }),
        { silent: false },
      );
    });

    it("emits timeSinceReload=0 when no lastReloadTime is available", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=2");
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue(null);
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-reset", timeSinceReload: 0 }),
        { silent: false },
      );
    });
  });

  describe("triggerRetry - strict URL parsing (malformed values)", () => {
    it("treats '1foo' as null attempt (no retry state restored)", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=1foo");
      triggerRetry({ error: new Error("chunk error") });
      // Should start at attempt 0 → next is 1, delay is 1000
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, delay: 1000, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("treats '-1abc' as null attempt", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=-1abc");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("treats '-1' (sentinel) as null attempt (strict parse rejects it)", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=-1");
      // The orchestrator strictly parses: only /^\d+$/ passes, -1 is rejected
      triggerRetry({ error: new Error("chunk error") });
      // Should start fresh from attempt 0
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("treats '1.5' as null attempt", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=1.5");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("treats '1e2' as null attempt", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=1e2");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("treats attempt=101 as exhausted (not restarted) when reloadDelays has 3 entries", () => {
      // Previously MAX_RETRY_ATTEMPT=100 cap would cause 101 to parse as null,
      // resetting currentAttempt to 0 and restarting the cycle instead of exhausting.
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=101");
      const result = triggerRetry({ error: new Error("chunk error") });
      expect(result).toEqual({ status: "fallback" });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ finalAttempt: 101, name: "retry-exhausted" }),
        { silent: false },
      );
    });

    it("accepts '2' as valid attempt=2", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=2");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 3, delay: 5000, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("treats an astronomically large digit string (parseInt => Infinity) as null attempt", () => {
      const huge = "9".repeat(400);
      setupMockLocation(`http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=${huge}`);
      // Infinity > reloadDelays.length=3, but we should reject non-finite values before
      // reaching exhaust logic; after rejection currentAttempt=0 => schedules retry
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt" }),
        { silent: false },
      );
    });
  });

  describe("triggerRetry - useRetryId=false", () => {
    it("does not include spaGuardRetryId in reload URL when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      triggerRetry({ error: new Error("chunk error") });
      vi.advanceTimersByTime(1000);
      expect(mockLocationHref).toContain("spaGuardRetryAttempt=1");
      expect(mockLocationHref).not.toContain("spaGuardRetryId=");
    });

    it("does not call setLastReloadTime when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      triggerRetry({ error: new Error("chunk error") });
      vi.advanceTimersByTime(1000);
      expect(mockSetLastReloadTime).not.toHaveBeenCalled();
    });
  });

  describe("triggerRetry - silent flag", () => {
    it("passes silent: true to retry-attempt when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      triggerRetry({ error: new Error("ignored error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-attempt" }),
        { silent: true },
      );
    });

    it("passes silent: false to retry-attempt when shouldIgnoreMessages returns false", () => {
      mockShouldIgnoreMessages.mockReturnValue(false);
      triggerRetry({ error: new Error("normal error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("passes silent: true to retry-exhausted when shouldIgnoreMessages returns true", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=r1&spaGuardRetryAttempt=3");
      mockShouldIgnoreMessages.mockReturnValue(true);
      triggerRetry({ error: new Error("ignored error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-exhausted" }),
        { silent: true },
      );
    });

    it("passes silent: true to retry-reset when shouldIgnoreMessages returns true", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=2");
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 2,
        retryId: "old-id",
        timestamp: Date.now() - 6000,
      });
      mockShouldIgnoreMessages.mockReturnValue(true);
      triggerRetry({ error: new Error("ignored error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "retry-reset" }), {
        silent: true,
      });
    });

    it("emits chunk-error with isRetrying=true when reset resets attempt to 0", () => {
      // urlAttempt=3 would be exhausted (>= reloadDelays.length=3) without reset,
      // but reset brings it back to 0, so isRetrying should be true
      setupMockLocation("http://localhost/?spaGuardRetryId=old-id&spaGuardRetryAttempt=3");
      mockShouldResetRetryCycle.mockReturnValue(true);
      mockGetLastReloadTime.mockReturnValue({
        attemptNumber: 3,
        retryId: "old-id",
        timestamp: Date.now() - 40_000,
      });
      mockGenerateRetryId.mockReturnValue("new-retry-id");
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ isRetrying: true, name: "chunk-error" }),
      );
    });
  });

  describe("triggerRetry - logger calls", () => {
    it("calls retryCycleStarting with retryId and current attempt", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(mockLogger.retryCycleStarting).toHaveBeenCalledWith("generated-retry-id", 0);
    });

    it("calls retrySchedulingReload before timeout fires", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(mockLogger.retrySchedulingReload).toHaveBeenCalledWith("generated-retry-id", 1, 1000);
    });

    it("calls fallbackAlreadyShown when isInFallbackMode returns true", () => {
      mockIsInFallbackMode.mockReturnValue(true);
      const error = new Error("chunk error");
      triggerRetry({ error });
      expect(mockLogger.fallbackAlreadyShown).toHaveBeenCalledWith(error);
    });

    it("calls reloadAlreadyScheduled on deduped call", () => {
      const e2 = new Error("second");
      triggerRetry({ error: new Error("first") });
      triggerRetry({ error: e2 });
      expect(mockLogger.reloadAlreadyScheduled).toHaveBeenCalledWith(e2);
    });

    it("does not throw when no logger is set", () => {
      mockGetLogger.mockReturnValue();
      expect(() => triggerRetry({ error: new Error("chunk error") })).not.toThrow();
    });
  });

  describe("triggerRetry - edge cases", () => {
    it("handles null error without throwing", () => {
      expect(() => triggerRetry({ error: null })).not.toThrow();
    });

    it("handles undefined error without throwing", () => {
      expect(() => triggerRetry()).not.toThrow();
    });

    it("handles non-Error object without throwing", () => {
      expect(() => triggerRetry({ error: { code: 500 } })).not.toThrow();
    });

    it("uses 1000ms fallback delay when reloadDelays entry is undefined (sparse array)", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        reloadDelays: [undefined as unknown as number],
      });
      triggerRetry({ error: new Error("chunk error") });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 1000, name: "retry-attempt" }),
        { silent: false },
      );
    });

    it("does not call setLastReloadTime when useRetryId=true but enableRetryReset=false", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        enableRetryReset: false,
        useRetryId: true,
      });
      triggerRetry({ error: new Error("chunk error") });
      vi.advanceTimersByTime(1000);
      expect(mockSetLastReloadTime).not.toHaveBeenCalled();
    });

    it("resets phase to idle on internal exception", () => {
      mockGetOptions.mockImplementationOnce(() => {
        throw new Error("options threw");
      });
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().phase).toBe("idle");
    });

    it("allows new trigger after internal exception resets phase", () => {
      mockGetOptions.mockImplementationOnce(() => {
        throw new Error("options threw");
      });
      triggerRetry({ error: new Error("chunk error") });
      const result = triggerRetry({ error: new Error("second") });
      expect(result).toEqual({ status: "accepted" });
    });
  });

  describe("markRetryHealthyBoot", () => {
    it("resets phase to idle", () => {
      triggerRetry({ error: new Error("chunk error") });
      markRetryHealthyBoot();
      expect(getRetrySnapshot().phase).toBe("idle");
    });

    it("resets attempt to 0", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=2");
      triggerRetry({ error: new Error("chunk error") });
      markRetryHealthyBoot();
      expect(getRetrySnapshot().attempt).toBe(0);
    });

    it("cancels pending reload timer", () => {
      triggerRetry({ error: new Error("chunk error") });
      markRetryHealthyBoot();
      vi.advanceTimersByTime(10_000);
      // Navigation should NOT have happened
      expect(mockLocationHref).toBe("http://localhost/");
    });

    it("clears retry params from URL", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=1");
      triggerRetry({ error: new Error("chunk error") });
      markRetryHealthyBoot();
      // history.replaceState should be called to remove params
      expect(globalThis.window.history.replaceState as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    });

    it("calls clearLastReloadTime", () => {
      triggerRetry({ error: new Error("chunk error") });
      mockClearLastReloadTime.mockClear();
      markRetryHealthyBoot();
      expect(mockClearLastReloadTime).toHaveBeenCalledTimes(1);
    });

    it("calls clearLastRetryResetInfo to prevent stale reset guard after healthy boot", () => {
      triggerRetry({ error: new Error("chunk error") });
      mockClearLastRetryResetInfo.mockClear();
      markRetryHealthyBoot();
      expect(mockClearLastRetryResetInfo).toHaveBeenCalledTimes(1);
    });

    it("allows new trigger after healthy boot", () => {
      triggerRetry({ error: new Error("chunk error") });
      markRetryHealthyBoot();
      const result = triggerRetry({ error: new Error("new error") });
      expect(result).toEqual({ status: "accepted" });
    });

    it("calls resetFallbackMode to clear fallback state flag", () => {
      triggerRetry({ error: new Error("chunk error") });
      mockResetFallbackMode.mockClear();
      markRetryHealthyBoot();
      expect(mockResetFallbackMode).toHaveBeenCalledTimes(1);
    });

    it("resets retryId to null in snapshot", () => {
      triggerRetry({ error: new Error("chunk error") });
      markRetryHealthyBoot();
      expect(getRetrySnapshot().retryId).toBe(null);
    });

    it("resets lastSource to undefined in snapshot", () => {
      triggerRetry({ error: new Error("chunk error"), source: "chunk-error" });
      markRetryHealthyBoot();
      expect(getRetrySnapshot().lastSource).toBeUndefined();
    });
  });

  describe("getRetrySnapshot", () => {
    it("returns idle phase initially", () => {
      const snap = getRetrySnapshot();
      expect(snap.phase).toBe("idle");
    });

    it("returns attempt=0 initially", () => {
      expect(getRetrySnapshot().attempt).toBe(0);
    });

    it("returns retryId=null initially", () => {
      expect(getRetrySnapshot().retryId).toBe(null);
    });

    it("returns scheduled phase after trigger", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().phase).toBe("scheduled");
    });

    it("returns correct attempt after trigger", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().attempt).toBe(1);
    });

    it("returns retryId after trigger", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().retryId).toBe("generated-retry-id");
    });

    it("returns fallback phase after exhaustion", () => {
      setupMockLocation("http://localhost/?spaGuardRetryId=id&spaGuardRetryAttempt=3");
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().phase).toBe("fallback");
    });
  });

  describe("setFallbackStateForDebug", () => {
    it("sets phase to fallback", () => {
      setFallbackStateForDebug();
      expect(getRetrySnapshot().phase).toBe("fallback");
    });

    it("calls setFallbackMode", () => {
      setFallbackStateForDebug();
      expect(mockSetFallbackMode).toHaveBeenCalledTimes(1);
    });

    it("calls showFallbackUI", () => {
      setFallbackStateForDebug();
      expect(mockShowFallbackUI).toHaveBeenCalledTimes(1);
    });

    it("cancels a pending scheduled reload timer so it does not navigate after fallback", () => {
      triggerRetry({ error: new Error("chunk error") });
      expect(getRetrySnapshot().phase).toBe("scheduled");
      setFallbackStateForDebug();
      vi.advanceTimersByTime(10_000);
      // Navigation should NOT have happened (URL stays at initial value)
      expect(mockLocationHref).toBe("http://localhost/");
    });

    it("does not navigate when called with no pending timer", () => {
      setFallbackStateForDebug();
      vi.advanceTimersByTime(10_000);
      expect(mockLocationHref).toBe("http://localhost/");
    });
  });

  describe("resetRetryOrchestratorForTests", () => {
    it("resets phase to idle", () => {
      triggerRetry({ error: new Error("chunk error") });
      resetRetryOrchestratorForTests();
      expect(getRetrySnapshot().phase).toBe("idle");
    });

    it("cancels pending timer", () => {
      triggerRetry({ error: new Error("chunk error") });
      resetRetryOrchestratorForTests();
      vi.advanceTimersByTime(10_000);
      expect(mockLocationHref).toBe("http://localhost/");
    });

    it("allows fresh trigger after reset", () => {
      triggerRetry({ error: new Error("first") });
      resetRetryOrchestratorForTests();
      const result = triggerRetry({ error: new Error("second") });
      expect(result).toEqual({ status: "accepted" });
    });

    it("calls resetFallbackMode to clear fallback state flag", () => {
      triggerRetry({ error: new Error("first") });
      mockResetFallbackMode.mockClear();
      resetRetryOrchestratorForTests();
      expect(mockResetFallbackMode).toHaveBeenCalledTimes(1);
    });
  });
});
