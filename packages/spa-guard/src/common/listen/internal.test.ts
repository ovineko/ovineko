import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../isChunkError", () => ({
  isChunkError: vi.fn(),
}));

vi.mock("../log", () => ({
  logMessage: vi.fn((msg: string) => msg),
}));

vi.mock("../options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("../reload", () => ({
  attemptReload: vi.fn(),
}));

vi.mock("../retryState", () => ({
  getRetryInfoForBeacon: vi.fn(),
  getRetryStateFromUrl: vi.fn(),
  updateRetryStateInUrl: vi.fn(),
}));

vi.mock("../sendBeacon", () => ({
  sendBeacon: vi.fn(),
}));

vi.mock("../shouldIgnore", () => ({
  shouldIgnoreMessages: vi.fn(),
}));

import { isChunkError } from "../isChunkError";
import { getOptions } from "../options";
import { attemptReload } from "../reload";
import { getRetryInfoForBeacon, getRetryStateFromUrl, updateRetryStateInUrl } from "../retryState";
import { sendBeacon } from "../sendBeacon";
import { shouldIgnoreMessages } from "../shouldIgnore";
import { listenInternal } from "./internal";

const mockIsChunkError = vi.mocked(isChunkError);
const mockGetOptions = vi.mocked(getOptions);
const mockAttemptReload = vi.mocked(attemptReload);
const mockGetRetryInfoForBeacon = vi.mocked(getRetryInfoForBeacon);
const mockGetRetryStateFromUrl = vi.mocked(getRetryStateFromUrl);
const mockUpdateRetryStateInUrl = vi.mocked(updateRetryStateInUrl);
const mockSendBeacon = vi.mocked(sendBeacon);
const mockShouldIgnoreMessages = vi.mocked(shouldIgnoreMessages);

const DEFAULT_OPTIONS = {
  reloadDelays: [1000, 2000, 5000],
};

interface CapturedHandlers {
  error?: (event: any) => void;
  securitypolicyviolation?: (event: any) => void;
  unhandledrejection?: (event: any) => void;
  "vite:preloadError"?: (event: any) => void;
}

function captureListeners(mockSerialize = vi.fn().mockReturnValue('{"serialized":"error"}')): {
  handlers: CapturedHandlers;
  mockSerialize: ReturnType<typeof vi.fn>;
} {
  const handlers: CapturedHandlers = {};
  const spy = vi
    .spyOn(window, "addEventListener")
    .mockImplementation((type: string, handler: any) => {
      handlers[type as keyof CapturedHandlers] = handler;
    });
  listenInternal(mockSerialize);
  spy.mockRestore();
  return { handlers, mockSerialize };
}

describe("listenInternal", () => {
  beforeEach(() => {
    mockGetOptions.mockReturnValue({ ...DEFAULT_OPTIONS });
    mockGetRetryStateFromUrl.mockReturnValue(null);
    mockGetRetryInfoForBeacon.mockReturnValue({});
    mockIsChunkError.mockReturnValue(false);
    mockShouldIgnoreMessages.mockReturnValue(false);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("calls getOptions on initialization", () => {
      captureListeners();
      expect(mockGetOptions).toHaveBeenCalled();
    });

    it("calls getRetryStateFromUrl on initialization", () => {
      captureListeners();
      expect(mockGetRetryStateFromUrl).toHaveBeenCalled();
    });

    it("calls updateRetryStateInUrl with retryId and -1 when retryAttempt >= reloadDelays.length", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "test-id" });
      captureListeners();
      expect(mockUpdateRetryStateInUrl).toHaveBeenCalledWith("test-id", -1);
    });

    it("calls updateRetryStateInUrl when retryAttempt strictly equals reloadDelays.length", () => {
      // reloadDelays.length = 3, retryAttempt = 3 → 3 >= 3 → true
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 3, retryId: "exact-match-id" });
      captureListeners();
      expect(mockUpdateRetryStateInUrl).toHaveBeenCalledWith("exact-match-id", -1);
    });

    it("does not call updateRetryStateInUrl when retryAttempt < reloadDelays.length", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 1, retryId: "test-id" });
      captureListeners();
      expect(mockUpdateRetryStateInUrl).not.toHaveBeenCalled();
    });

    it("does not call updateRetryStateInUrl when retryAttempt is last valid attempt (length - 1)", () => {
      mockGetRetryStateFromUrl.mockReturnValue({ retryAttempt: 2, retryId: "test-id" });
      captureListeners();
      expect(mockUpdateRetryStateInUrl).not.toHaveBeenCalled();
    });

    it("does not call updateRetryStateInUrl when retryState is null", () => {
      mockGetRetryStateFromUrl.mockReturnValue(null);
      captureListeners();
      expect(mockUpdateRetryStateInUrl).not.toHaveBeenCalled();
    });

    it("registers exactly 4 event listeners", () => {
      const spy = vi.spyOn(window, "addEventListener").mockImplementation(() => {});
      listenInternal(vi.fn());
      expect(spy).toHaveBeenCalledTimes(4);
      spy.mockRestore();
    });

    it("registers listeners for error, unhandledrejection, securitypolicyviolation, vite:preloadError", () => {
      const registeredTypes: string[] = [];
      const spy = vi.spyOn(window, "addEventListener").mockImplementation((type: string) => {
        registeredTypes.push(type);
      });
      listenInternal(vi.fn());
      spy.mockRestore();
      expect(registeredTypes).toContain("error");
      expect(registeredTypes).toContain("unhandledrejection");
      expect(registeredTypes).toContain("securitypolicyviolation");
      expect(registeredTypes).toContain("vite:preloadError");
    });

    it("registers error listener with capture phase (true as third arg)", () => {
      const spy = vi.spyOn(window, "addEventListener").mockImplementation(() => {});
      listenInternal(vi.fn());
      const errorCall = spy.mock.calls.find(([type]) => type === "error");
      spy.mockRestore();
      expect(errorCall?.[2]).toBe(true);
    });

    it("returns undefined - no unlisten function is provided", () => {
      const spy = vi.spyOn(window, "addEventListener").mockImplementation(() => {});
      const result = listenInternal(vi.fn());
      spy.mockRestore();
      expect(result).toBeUndefined();
    });
  });

  describe("window.error listener (sync errors captured)", () => {
    it("calls sendBeacon for non-chunk errors", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "Regular error", preventDefault: vi.fn() });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("sends beacon with eventName 'error'", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "Regular error", preventDefault: vi.fn() });
      expect(mockSendBeacon).toHaveBeenCalledWith(expect.objectContaining({ eventName: "error" }));
    });

    it("sends beacon with event.message as errorMessage", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "Test error message", preventDefault: vi.fn() });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "Test error message" }),
      );
    });

    it("calls serializeError with the full event object", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers, mockSerialize } = captureListeners();
      const event = { message: "test", preventDefault: vi.fn() };
      handlers.error!(event);
      expect(mockSerialize).toHaveBeenCalledWith(event);
    });

    it("sends beacon with serialized error from serializeError", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers, mockSerialize } = captureListeners();
      mockSerialize.mockReturnValue('{"type":"Error"}');
      const event = { message: "test", preventDefault: vi.fn() };
      handlers.error!(event);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ serialized: '{"type":"Error"}' }),
      );
    });

    it("includes retry info from getRetryInfoForBeacon in the beacon", () => {
      mockIsChunkError.mockReturnValue(false);
      mockGetRetryInfoForBeacon.mockReturnValue({ retryAttempt: 1, retryId: "rid-123" });
      const { handlers } = captureListeners();
      handlers.error!({ message: "test", preventDefault: vi.fn() });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ retryAttempt: 1, retryId: "rid-123" }),
      );
    });

    it("calls event.preventDefault() for chunk errors", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.error!({
        message: "Failed to fetch dynamically imported module",
        preventDefault: mockPreventDefault,
      });
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    it("calls attemptReload with the full event for chunk errors", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const event = {
        message: "Failed to fetch dynamically imported module",
        preventDefault: vi.fn(),
      };
      handlers.error!(event);
      expect(mockAttemptReload).toHaveBeenCalledWith(event);
    });

    it("does not call sendBeacon for chunk errors", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({ message: "ChunkLoadError", preventDefault: vi.fn() });
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("passes full event to isChunkError", () => {
      const { handlers } = captureListeners();
      const event = { message: "test", preventDefault: vi.fn() };
      handlers.error!(event);
      expect(mockIsChunkError).toHaveBeenCalledWith(event);
    });

    it("suppresses console.error when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({ message: "ignored error", preventDefault: vi.fn() });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("logs console.error when error is not ignored", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "visible error", preventDefault: vi.fn() });
      expect(console.error).toHaveBeenCalled();
    });

    it("still calls sendBeacon when shouldIgnoreMessages returns true (shouldIgnore only affects logging)", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({ message: "ignored error", preventDefault: vi.fn() });
      // sendBeacon is still invoked from listenInternal; filtering happens inside sendBeacon itself
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("checks shouldIgnoreMessages with event.message", () => {
      const { handlers } = captureListeners();
      handlers.error!({ message: "specific message", preventDefault: vi.fn() });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith(["specific message"]);
    });
  });

  describe("unhandledrejection listener (promise rejections captured)", () => {
    it("calls sendBeacon for non-chunk rejection reasons", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({
        preventDefault: vi.fn(),
        reason: new Error("test rejection"),
      });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("sends beacon with eventName 'unhandledrejection'", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("test") });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "unhandledrejection" }),
      );
    });

    it("sends beacon with String(event.reason) as errorMessage", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      const reason = new Error("Promise rejection message");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: String(reason) }),
      );
    });

    it("calls event.preventDefault() for chunk error rejection reasons", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.unhandledrejection!({
        preventDefault: mockPreventDefault,
        reason: new Error("Failed to fetch dynamically imported module"),
      });
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    it("calls attemptReload with event.reason (not the full event) for chunk errors", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const reason = new Error("ChunkLoadError");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockAttemptReload).toHaveBeenCalledWith(reason);
    });

    it("does not call sendBeacon for chunk error rejection reasons", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({
        preventDefault: vi.fn(),
        reason: new Error("ChunkLoadError"),
      });
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("passes event.reason to isChunkError (not the full event)", () => {
      const { handlers } = captureListeners();
      const reason = new Error("test rejection");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockIsChunkError).toHaveBeenCalledWith(reason);
    });

    it("serializes the full rejection event (not just reason)", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers, mockSerialize } = captureListeners();
      const event = { preventDefault: vi.fn(), reason: new Error("test") };
      handlers.unhandledrejection!(event);
      expect(mockSerialize).toHaveBeenCalledWith(event);
    });

    it("suppresses console.error when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("ignored") });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("still calls sendBeacon when shouldIgnoreMessages returns true (shouldIgnore only affects logging)", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("ignored") });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("handles string rejection reasons", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: "plain string rejection" });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "plain string rejection" }),
      );
    });

    it("handles undefined rejection reason without throwing", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      expect(() => {
        handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: undefined });
      }).not.toThrow();
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "undefined" }),
      );
    });

    it("checks shouldIgnoreMessages with String(event.reason)", () => {
      const { handlers } = captureListeners();
      const reason = new Error("my rejection");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith([String(reason)]);
    });
  });

  describe("securitypolicyviolation listener (CSP errors captured)", () => {
    it("calls sendBeacon for CSP violations", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com/script.js",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("sends beacon with eventName 'securitypolicyviolation'", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://cdn.evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "img-src",
      });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "securitypolicyviolation" }),
      );
    });

    it("formats eventMessage as '{violatedDirective}: {blockedURI}'", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com/script.js",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ eventMessage: "script-src: https://evil.com/script.js" }),
      );
    });

    it("uses eventMessage field (not errorMessage) for CSP violations", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      const call = mockSendBeacon.mock.calls[0]![0];
      expect(call).not.toHaveProperty("errorMessage");
      expect(call).toHaveProperty("eventMessage");
    });

    it("serializes the full CSP event", () => {
      const { handlers, mockSerialize } = captureListeners();
      const event = {
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      };
      handlers.securitypolicyviolation!(event);
      expect(mockSerialize).toHaveBeenCalledWith(event);
    });

    it("passes serialized result to sendBeacon", () => {
      const { handlers, mockSerialize } = captureListeners();
      mockSerialize.mockReturnValue('{"csp":"violation"}');
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ serialized: '{"csp":"violation"}' }),
      );
    });

    it("checks shouldIgnoreMessages with the formatted eventMessage", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith(["script-src: https://evil.com"]);
    });

    it("suppresses console.error when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("still calls sendBeacon when shouldIgnoreMessages returns true (shouldIgnore only affects logging)", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("does not call attemptReload for CSP violations", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockAttemptReload).not.toHaveBeenCalled();
    });

    it("includes retry info from getRetryInfoForBeacon", () => {
      mockGetRetryInfoForBeacon.mockReturnValue({ retryAttempt: 2, retryId: "csp-retry-id" });
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ retryAttempt: 2, retryId: "csp-retry-id" }),
      );
    });
  });

  describe("vite:preloadError listener (Vite chunk errors captured)", () => {
    it("calls event.preventDefault()", () => {
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers["vite:preloadError"]!({
        payload: { message: "preload error" },
        preventDefault: mockPreventDefault,
      });
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    it("calls attemptReload with the full event", () => {
      const { handlers } = captureListeners();
      const event = { payload: { message: "preload error" }, preventDefault: vi.fn() };
      handlers["vite:preloadError"]!(event);
      expect(mockAttemptReload).toHaveBeenCalledWith(event);
    });

    it("does not call sendBeacon - always uses attemptReload", () => {
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        payload: { message: "preload error" },
        preventDefault: vi.fn(),
      });
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("uses payload.message for shouldIgnoreMessages when payload is available", () => {
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        message: "different message",
        payload: { message: "chunk failed to load" },
        preventDefault: vi.fn(),
      });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith(["chunk failed to load"]);
    });

    it("falls back to event.message when payload is not present", () => {
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        message: "fallback message",
        preventDefault: vi.fn(),
      });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith(["fallback message"]);
    });

    it("falls back to event.message when payload.message is falsy (empty string)", () => {
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        message: "event level message",
        payload: { message: "" },
        preventDefault: vi.fn(),
      });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith(["event level message"]);
    });

    it("suppresses console.error when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        payload: { message: "ignored chunk error" },
        preventDefault: vi.fn(),
      });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("still calls attemptReload when shouldIgnoreMessages returns true (shouldIgnore only affects logging)", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        payload: { message: "ignored chunk error" },
        preventDefault: vi.fn(),
      });
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
    });

    it("logs console.error when error is not ignored", () => {
      mockShouldIgnoreMessages.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        payload: { message: "visible chunk error" },
        preventDefault: vi.fn(),
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("chunk error → handleErrorWithSpaGuard integration", () => {
    it("window error event with chunk error calls attemptReload (not sendBeacon)", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({
        message: "Failed to fetch dynamically imported module",
        preventDefault: vi.fn(),
      });
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("unhandledrejection with chunk error reason calls attemptReload with the reason", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const reason = new Error("ChunkLoadError");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockAttemptReload).toHaveBeenCalledWith(reason);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("vite:preloadError always calls attemptReload (does not check isChunkError)", () => {
      // vite:preloadError handler doesn't call isChunkError - it always does attemptReload
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      const event = { payload: { message: "vite preload" }, preventDefault: vi.fn() };
      handlers["vite:preloadError"]!(event);
      expect(mockAttemptReload).toHaveBeenCalledWith(event);
      expect(mockIsChunkError).not.toHaveBeenCalled();
    });

    it("non-chunk window error sends beacon via serializeError pipeline", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers, mockSerialize } = captureListeners();
      mockSerialize.mockReturnValue('{"type":"Error","message":"regular"}');
      const event = { message: "regular error", preventDefault: vi.fn() };
      handlers.error!(event);
      expect(mockSerialize).toHaveBeenCalledWith(event);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "regular error",
          eventName: "error",
          serialized: '{"type":"Error","message":"regular"}',
        }),
      );
    });
  });

  describe("listener cleanup (no unlisten functionality)", () => {
    it("listenInternal returns undefined - no cleanup function is provided", () => {
      const spy = vi.spyOn(window, "addEventListener").mockImplementation(() => {});
      const result = listenInternal(vi.fn());
      spy.mockRestore();
      expect(result).toBeUndefined();
    });

    it("calling listenInternal twice registers each listener type twice", () => {
      const registeredTypes: string[] = [];
      const spy = vi.spyOn(window, "addEventListener").mockImplementation((type: string) => {
        registeredTypes.push(type);
      });
      listenInternal(vi.fn());
      listenInternal(vi.fn());
      spy.mockRestore();
      // Each call registers 4 listeners → 2 calls = 8 total registrations
      expect(registeredTypes.filter((t) => t === "error")).toHaveLength(2);
      expect(registeredTypes.filter((t) => t === "unhandledrejection")).toHaveLength(2);
    });
  });

  describe("edge cases", () => {
    it("handles error event with undefined message without throwing", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      expect(() => {
        handlers.error!({ message: undefined, preventDefault: vi.fn() });
      }).not.toThrow();
    });

    it("sends beacon with undefined errorMessage when event.message is undefined", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: undefined, preventDefault: vi.fn() });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: undefined }),
      );
    });

    it("handles unhandledrejection with null reason without throwing", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      expect(() => {
        handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: null });
      }).not.toThrow();
    });

    it("sends 'null' as errorMessage for null rejection reason", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: null });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "null" }),
      );
    });

    it("handles securitypolicyviolation event with empty directive and URI without throwing", () => {
      const { handlers } = captureListeners();
      expect(() => {
        handlers.securitypolicyviolation!({
          blockedURI: "",
          preventDefault: vi.fn(),
          violatedDirective: "",
        });
      }).not.toThrow();
    });

    it("handles vite:preloadError event without payload or message without throwing", () => {
      const { handlers } = captureListeners();
      expect(() => {
        handlers["vite:preloadError"]!({ preventDefault: vi.fn() });
      }).not.toThrow();
    });

    it("handles vite:preloadError with undefined payload without throwing", () => {
      const { handlers } = captureListeners();
      const event = { payload: undefined, preventDefault: vi.fn() };
      expect(() => handlers["vite:preloadError"]!(event)).not.toThrow();
      expect(mockAttemptReload).toHaveBeenCalledWith(event);
    });

    it("multiple different listeners can be triggered independently", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "error1", preventDefault: vi.fn() });
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("rejection1") });
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      // error + unhandledrejection + securitypolicyviolation all send beacons
      expect(mockSendBeacon).toHaveBeenCalledTimes(3);
    });

    it("getRetryInfoForBeacon is called for error beacon", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "test", preventDefault: vi.fn() });
      expect(mockGetRetryInfoForBeacon).toHaveBeenCalled();
    });

    it("getRetryInfoForBeacon is called for unhandledrejection beacon", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("test") });
      expect(mockGetRetryInfoForBeacon).toHaveBeenCalled();
    });

    it("getRetryInfoForBeacon is called for securitypolicyviolation beacon", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockGetRetryInfoForBeacon).toHaveBeenCalled();
    });
  });
});
