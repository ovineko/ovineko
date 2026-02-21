import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./events/internal", () => ({
  emitEvent: vi.fn(),
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
  clearRetryStateFromUrl: vi.fn(),
  generateRetryId: vi.fn(),
  getRetryStateFromUrl: vi.fn(),
  updateRetryStateInUrl: vi.fn(),
}));

vi.mock("./sendBeacon", () => ({
  sendBeacon: vi.fn(),
}));

vi.mock("./shouldIgnore", () => ({
  shouldIgnoreMessages: vi.fn(),
}));

import { emitEvent } from "./events/internal";
import {
  clearLastReloadTime,
  getLastReloadTime,
  setLastReloadTime,
  setLastRetryResetInfo,
  shouldResetRetryCycle,
} from "./lastReloadTime";
import { getOptions } from "./options";
import { attemptReload } from "./reload";
import {
  clearRetryStateFromUrl,
  generateRetryId,
  getRetryStateFromUrl,
  updateRetryStateInUrl,
} from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { shouldIgnoreMessages } from "./shouldIgnore";

const mockEmitEvent = vi.mocked(emitEvent);
const mockClearLastReloadTime = vi.mocked(clearLastReloadTime);
const mockGetLastReloadTime = vi.mocked(getLastReloadTime);
const mockSetLastReloadTime = vi.mocked(setLastReloadTime);
const mockSetLastRetryResetInfo = vi.mocked(setLastRetryResetInfo);
const mockShouldResetRetryCycle = vi.mocked(shouldResetRetryCycle);
const mockGetOptions = vi.mocked(getOptions);
const mockClearRetryStateFromUrl = vi.mocked(clearRetryStateFromUrl);
const mockGenerateRetryId = vi.mocked(generateRetryId);
const mockGetRetryStateFromUrl = vi.mocked(getRetryStateFromUrl);
const mockUpdateRetryStateInUrl = vi.mocked(updateRetryStateInUrl);
const mockSendBeacon = vi.mocked(sendBeacon);
const mockShouldIgnoreMessages = vi.mocked(shouldIgnoreMessages);

const defaultOptions = {
  enableRetryReset: true,
  fallback: {
    html: "<div>Fallback UI</div>",
    selector: "body",
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

  Object.defineProperty(window, "location", {
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
  beforeEach(() => {
    vi.useFakeTimers();
    setupMockLocation();
    mockGetOptions.mockReturnValue(defaultOptions);
    mockGetRetryStateFromUrl.mockReturnValue(null);
    mockGenerateRetryId.mockReturnValue("generated-retry-id");
    mockShouldResetRetryCycle.mockReturnValue(false);
    mockGetLastReloadTime.mockReturnValue(null);
    mockShouldIgnoreMessages.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("basic reload cycle - attempt 0", () => {
    it("emits retry-attempt event with attempt=1 and delay=1000 on first call", () => {
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith({
        attempt: 1,
        delay: 1000,
        name: "retry-attempt",
        retryId: "generated-retry-id",
      });
    });

    it("generates a new retryId when no retry state in URL", () => {
      mockGetRetryStateFromUrl.mockReturnValue(null);
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockGenerateRetryId).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ retryId: "generated-retry-id" }),
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

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 500 }));

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

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 2000 }));
    });

    it("uses third delay for third attempt", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "r1" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 5000 }));
    });
  });

  describe("useRetryId=false - calls window.location.reload()", () => {
    it("calls window.location.reload() instead of setting href when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(1000);

      expect(mockLocationReload).toHaveBeenCalledTimes(1);
      expect(mockLocationHref).toBe("http://localhost/");
    });

    it("does not call setLastReloadTime when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      vi.advanceTimersByTime(1000);

      expect(mockSetLastReloadTime).not.toHaveBeenCalled();
    });

    it("does not read retry state from URL when useRetryId=false", () => {
      mockGetOptions.mockReturnValue({ ...defaultOptions, useRetryId: false });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockGetRetryStateFromUrl).not.toHaveBeenCalled();
    });
  });

  describe("max attempts exceeded → fallback shown", () => {
    it("emits retry-exhausted event when attempt >= reloadDelays.length", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ finalAttempt: 3, name: "retry-exhausted", retryId: "r1" }),
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
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      attemptReload(error);

      vi.advanceTimersByTime(5000);

      expect(mockLocationReload).not.toHaveBeenCalled();
      expect(mockLocationHref).toBe("http://localhost/");
    });

    it("does not emit retry-attempt event when max attempts exceeded", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const error = new Error("chunk error");

      const mockEl = { innerHTML: "" };
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
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEl.innerHTML).toBe("<div>Fallback UI</div>");
    });

    it("does not emit retry-attempt or retry-exhausted when attempt=-1", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      const eventNames = mockEmitEvent.mock.calls.map((call) => call[0]?.name);
      expect(eventNames).not.toContain("retry-attempt");
      expect(eventNames).not.toContain("retry-exhausted");
    });

    it("does not navigate when attempt=-1", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "" };
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
      );

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, name: "retry-attempt", retryId: "new-retry-id" }),
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
      );
    });
  });

  describe("fallback HTML injection (showFallbackUI)", () => {
    it("injects fallbackHtml into the target element matching selector", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(document.querySelector).toHaveBeenCalledWith("body");
      expect(mockEl.innerHTML).toBe("<div>Fallback UI</div>");
    });

    it("uses custom selector from fallback options", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        fallback: { html: "<div>Custom</div>", selector: "#app" },
      });
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(document.querySelector).toHaveBeenCalledWith("#app");
      expect(mockEl.innerHTML).toBe("<div>Custom</div>");
    });

    it("emits fallback-ui-shown event after injecting fallback HTML", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith({ name: "fallback-ui-shown" });
    });

    it("does not inject fallback HTML or emit event when no fallback html configured", () => {
      mockGetOptions.mockReturnValue({
        ...defaultOptions,
        fallback: { selector: "body" },
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

    it("updates retry state in URL when fallback is shown with existing retry state", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "r1" });
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockUpdateRetryStateInUrl).toHaveBeenCalledWith("r1", 4);
    });

    it("clears retry state from URL when fallback is shown with attempt=-1 state", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: -1, retryId: "r1" });
      const mockEl = { innerHTML: "" };
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
      const mockEl = { innerHTML: "" };
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
      const mockEl = { innerHTML: "" };
      vi.spyOn(document, "querySelector").mockReturnValue(mockEl as unknown as Element);
      vi.spyOn(document, "getElementsByClassName").mockReturnValue(
        [] as unknown as HTMLCollectionOf<Element>,
      );

      const error = new Error("chunk error");

      attemptReload(error);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "retry-exhausted" }),
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

      expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({ delay: 1000 }));
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
      const mockEl = { innerHTML: "" };
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
});
