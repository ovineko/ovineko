import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../logger";

vi.mock("../isChunkError", () => ({
  isChunkError: vi.fn(),
}));

vi.mock("../options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("../retryOrchestrator", () => ({
  triggerRetry: vi.fn(),
}));

vi.mock("../retryState", () => ({
  getRetryInfoForBeacon: vi.fn(),
}));

vi.mock("../sendBeacon", () => ({
  sendBeacon: vi.fn(),
}));

vi.mock("../shouldIgnore", () => ({
  shouldForceRetry: vi.fn(),
  shouldIgnoreMessages: vi.fn(),
}));

vi.mock("../events/internal", () => ({
  emitEvent: vi.fn(),
  getLogger: vi.fn(),
  isInitialized: vi.fn().mockReturnValue(false),
  markInitialized: vi.fn(),
  setLogger: vi.fn(),
}));

vi.mock("../isStaticAssetError", () => ({
  getAssetUrl: vi.fn(),
  getResourceTimingInfo: vi.fn(),
  getResourceUrl: vi.fn(),
  isLikely404: vi.fn(),
  isStaticAssetError: vi.fn(),
}));

vi.mock("../staticAssetRecovery", () => ({
  handleStaticAssetFailure: vi.fn(),
}));

import { emitEvent, getLogger, isInitialized, setLogger } from "../events/internal";
import { isChunkError } from "../isChunkError";
import {
  getAssetUrl,
  getResourceTimingInfo,
  getResourceUrl,
  isLikely404,
  isStaticAssetError,
} from "../isStaticAssetError";
import { getOptions } from "../options";
import { triggerRetry } from "../retryOrchestrator";
import { getRetryInfoForBeacon } from "../retryState";
import { sendBeacon } from "../sendBeacon";
import { shouldForceRetry, shouldIgnoreMessages } from "../shouldIgnore";
import { handleStaticAssetFailure } from "../staticAssetRecovery";
import { parseBeacon } from "../../schema/parse";
import { listenInternal } from "./internal";

const mockEmitEvent = vi.mocked(emitEvent);
const mockGetLogger = vi.mocked(getLogger);
const mockIsInitialized = vi.mocked(isInitialized);
const mockSetLogger = vi.mocked(setLogger);
const mockIsChunkError = vi.mocked(isChunkError);
const mockIsStaticAssetError = vi.mocked(isStaticAssetError);
const mockIsLikely404 = vi.mocked(isLikely404);
const mockGetAssetUrl = vi.mocked(getAssetUrl);
const mockGetResourceTimingInfo = vi.mocked(getResourceTimingInfo);
const mockGetResourceUrl = vi.mocked(getResourceUrl);
const mockGetOptions = vi.mocked(getOptions);
const mockTriggerRetry = vi.mocked(triggerRetry);
const mockGetRetryInfoForBeacon = vi.mocked(getRetryInfoForBeacon);
const mockSendBeacon = vi.mocked(sendBeacon);
const mockShouldForceRetry = vi.mocked(shouldForceRetry);
const mockShouldIgnoreMessages = vi.mocked(shouldIgnoreMessages);
const mockHandleStaticAssetFailure = vi.mocked(handleStaticAssetFailure);

const DEFAULT_OPTIONS = {
  handleUnhandledRejections: { retry: true, sendBeacon: true },
  reloadDelays: [1000, 2000, 5000],
};

interface CapturedHandlers {
  error?: (event: any) => void;
  securitypolicyviolation?: (event: any) => void;
  unhandledrejection?: (event: any) => void;
  "vite:preloadError"?: (event: any) => void;
}

const createMockLogger = (): Logger => ({
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

let mockLogger: Logger;

function captureListeners(mockSerialize = vi.fn().mockReturnValue('{"serialized":"error"}')): {
  handlers: CapturedHandlers;
  mockSerialize: ReturnType<typeof vi.fn>;
} {
  const handlers: CapturedHandlers = {};
  const spy = vi
    .spyOn(globalThis, "addEventListener")
    .mockImplementation((type: string, handler: any) => {
      handlers[type as keyof CapturedHandlers] = handler;
    });
  listenInternal(mockSerialize);
  spy.mockRestore();
  return { handlers, mockSerialize };
}

describe("listenInternal", () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
    mockIsInitialized.mockReturnValue(false);
    mockGetOptions.mockReturnValue({ ...DEFAULT_OPTIONS });
    mockGetRetryInfoForBeacon.mockReturnValue({});
    mockIsChunkError.mockReturnValue(false);
    mockIsStaticAssetError.mockReturnValue(false);
    mockIsLikely404.mockReturnValue(false);
    mockGetAssetUrl.mockReturnValue("");
    mockGetResourceTimingInfo.mockReturnValue({ hasEntry: false, noBytesDelivered: false });
    mockGetResourceUrl.mockImplementation((event) => {
      const target = event.target as HTMLLinkElement | HTMLScriptElement | null;
      return target?.src || target?.href || "";
    });
    mockShouldForceRetry.mockReturnValue(false);
    mockShouldIgnoreMessages.mockReturnValue(false);
    mockGetLogger.mockReturnValue(mockLogger);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("does not call getOptions on initialization - reads options at event time", () => {
      captureListeners();
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it("registers exactly 4 event listeners", () => {
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation(() => {});
      listenInternal(vi.fn());
      expect(spy).toHaveBeenCalledTimes(4);
      spy.mockRestore();
    });

    it("registers listeners for error, unhandledrejection, securitypolicyviolation, vite:preloadError", () => {
      const registeredTypes: string[] = [];
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation((type: string) => {
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
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation(() => {});
      listenInternal(vi.fn());
      const errorCall = spy.mock.calls.find(([type]) => type === "error");
      spy.mockRestore();
      expect(errorCall?.[2]).toBe(true);
    });

    it("returns undefined - no unlisten function is provided", () => {
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation(() => {});
      const result = listenInternal(vi.fn());
      spy.mockRestore();
      expect(result).toBeUndefined();
    });

    it("calls setLogger with logger argument", () => {
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation(() => {});
      const fakeLogger = { capturedError: vi.fn() } as any;
      listenInternal(vi.fn(), fakeLogger);
      spy.mockRestore();
      expect(mockSetLogger).toHaveBeenCalledWith(fakeLogger);
    });

    it("does not call setLogger when no logger is provided", () => {
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation(() => {});
      listenInternal(vi.fn());
      spy.mockRestore();
      expect(mockSetLogger).not.toHaveBeenCalled();
    });

    it("does not call setLogger when already initialized", () => {
      mockIsInitialized.mockReturnValue(true);
      const fakeLogger = { capturedError: vi.fn() } as any;
      listenInternal(vi.fn(), fakeLogger);
      expect(mockSetLogger).not.toHaveBeenCalled();
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

    it("delegates to triggerRetry with chunk-error source for chunk errors", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const innerError = new Error("Failed to fetch dynamically imported module");
      const event = {
        error: innerError,
        message: "Failed to fetch dynamically imported module",
        preventDefault: vi.fn(),
      };
      handlers.error!(event);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: innerError, source: "chunk-error" }),
      );
    });

    it("falls back to full event when event.error is undefined", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const event = {
        message: "Failed to fetch dynamically imported module",
        preventDefault: vi.fn(),
      };
      handlers.error!(event);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: event, source: "chunk-error" }),
      );
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

    it("does not call logger.capturedError when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({ message: "ignored error", preventDefault: vi.fn() });
      expect(mockLogger.capturedError).not.toHaveBeenCalled();
    });

    it("calls logger.capturedError with type and event when error is not ignored", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(false);
      const { handlers } = captureListeners();
      const event = { message: "visible error", preventDefault: vi.fn() };
      handlers.error!(event);
      expect(mockLogger.capturedError).toHaveBeenCalledWith("error", event);
    });

    it("does not call sendBeacon when shouldIgnoreMessages returns true", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers, mockSerialize } = captureListeners();
      handlers.error!({ message: "ignored error", preventDefault: vi.fn() });
      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockSerialize).not.toHaveBeenCalled();
    });

    it("does not call triggerRetry when shouldIgnoreMessages returns true", () => {
      mockIsChunkError.mockReturnValue(true);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({ message: "ignored chunk error", preventDefault: vi.fn() });
      expect(mockTriggerRetry).not.toHaveBeenCalled();
    });

    it("does not call preventDefault when shouldIgnoreMessages returns true", () => {
      mockIsChunkError.mockReturnValue(true);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.error!({ message: "ignored chunk error", preventDefault: mockPreventDefault });
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it("shouldIgnore takes priority over isChunkError and shouldForceRetry", () => {
      mockIsChunkError.mockReturnValue(true);
      mockShouldForceRetry.mockReturnValue(true);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({ message: "ignored", preventDefault: vi.fn() });
      expect(mockIsChunkError).not.toHaveBeenCalled();
      expect(mockShouldForceRetry).not.toHaveBeenCalled();
      expect(mockTriggerRetry).not.toHaveBeenCalled();
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("checks shouldIgnoreMessages with event.message", () => {
      const { handlers } = captureListeners();
      handlers.error!({ message: "specific message", preventDefault: vi.fn() });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith(["specific message"]);
    });
  });

  describe("static asset error path", () => {
    it("emits static-asset-load-failed event and calls handleStaticAssetFailure when asset error is a likely 404", () => {
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(true);
      mockGetAssetUrl.mockReturnValue("https://example.com/app.abc123.js");
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.error!({ message: "", preventDefault: mockPreventDefault });
      expect(mockEmitEvent).toHaveBeenCalledWith({
        name: "static-asset-load-failed",
        url: "https://example.com/app.abc123.js",
      });
      expect(mockHandleStaticAssetFailure).toHaveBeenCalledWith(
        "https://example.com/app.abc123.js",
      );
    });

    it("calls event.preventDefault() for static asset 404 errors", () => {
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(true);
      mockGetAssetUrl.mockReturnValue("https://example.com/chunk.xyz.js");
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.error!({ message: "", preventDefault: mockPreventDefault });
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    it("does not call handleStaticAssetFailure when autoRecover is false", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        staticAssets: { autoRecover: false },
      });
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(true);
      mockGetAssetUrl.mockReturnValue("https://example.com/chunk.xyz.js");
      const { handlers } = captureListeners();
      handlers.error!({ message: "", preventDefault: vi.fn() });
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "static-asset-load-failed" }),
      );
      expect(mockHandleStaticAssetFailure).not.toHaveBeenCalled();
    });

    it("does not treat static asset error as chunk error when it is a likely 404", () => {
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(true);
      mockGetAssetUrl.mockReturnValue("https://example.com/app.abc123.js");
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const target = document.createElement("script");
      target.src = "https://example.com/app.abc123.js";
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      handlers.error!(event);
      // Static asset 404 path reports the failure and returns without retry delegation.
      expect(mockTriggerRetry).not.toHaveBeenCalled();
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("keeps static asset recovery and events active when resource reports are disabled", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        resources: { report: "none" },
      });
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(true);
      mockGetAssetUrl.mockReturnValue("/assets/app-hash.js");
      const { handlers } = captureListeners();
      handlers.error!({ message: "", preventDefault: vi.fn() });

      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockGetResourceTimingInfo).not.toHaveBeenCalled();
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "static-asset-load-failed" }),
      );
      expect(mockHandleStaticAssetFailure).toHaveBeenCalledWith("/assets/app-hash.js");
    });

    it("applies the code-resource gate before inspecting a likely static 404", () => {
      mockGetOptions.mockReturnValue({ ...DEFAULT_OPTIONS, resources: { report: "code" } });
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(true);
      mockGetAssetUrl.mockReturnValue("https://example.com/icon.abc123.css");
      const target = document.createElement("link");
      target.rel = "icon";
      target.href = "https://example.com/icon.abc123.css";
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      const { handlers } = captureListeners();

      handlers.error!(event);

      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockGetResourceTimingInfo).not.toHaveBeenCalled();
      expect(mockHandleStaticAssetFailure).toHaveBeenCalledWith(
        "https://example.com/icon.abc123.css",
      );
    });

    it("falls through to normal error handling when isLikely404 returns false", () => {
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(false);
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "load error", preventDefault: vi.fn() });
      // Falls through to normal path
      expect(mockHandleStaticAssetFailure).not.toHaveBeenCalled();
      expect(mockEmitEvent).not.toHaveBeenCalled();
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("reports resource context and a known timing status", () => {
      const target = document.createElement("script");
      target.src = "https://cdn.example.com/assets/main.BCmQ-jq-.js";
      mockGetResourceTimingInfo.mockReturnValue({
        hasEntry: true,
        noBytesDelivered: false,
        responseStatus: 404,
      });
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      const { handlers } = captureListeners();
      handlers.error!(event);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining("Failed to load"),
          errorType: "script",
          eventName: "resource-error",
          httpStatus: 404,
          url: target.src,
        }),
      );
    });

    it("uses a distinct context for a resource that delivered no bytes", () => {
      mockGetResourceTimingInfo.mockReturnValue({ hasEntry: true, noBytesDelivered: true });
      mockIsStaticAssetError.mockReturnValue(false);
      const target = document.createElement("script");
      target.src = "https://cdn.example.com/assets/main.BCmQ-jq-.js";
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      const { handlers } = captureListeners();
      handlers.error!(event);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          errorContext: expect.stringContaining("no bytes delivered"),
          eventName: "resource-error",
        }),
      );
    });

    it.each([
      ["code", "script", true],
      ["code", "img", false],
      ["all", "img", true],
      ["none", "script", false],
    ] as const)("applies resources.report=%s to %s failures", (report, tag, reported) => {
      mockGetOptions.mockReturnValue({ ...DEFAULT_OPTIONS, resources: { report } });
      const target = document.createElement(tag);
      if (tag === "script") target.src = "https://cdn.example.com/assets/app.js";
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      const { handlers } = captureListeners();
      handlers.error!(event);
      expect(mockSendBeacon).toHaveBeenCalledTimes(reported ? 1 : 0);
    });

    it("reports only code links when resources.report is code", () => {
      mockGetOptions.mockReturnValue({ ...DEFAULT_OPTIONS, resources: { report: "code" } });
      const font = document.createElement("link");
      font.rel = "preload";
      font.as = "font";
      font.href = "/font.woff2";
      const fontEvent = new Event("error");
      Object.defineProperty(fontEvent, "target", { value: font });
      const { handlers } = captureListeners();
      handlers.error!(fontEvent);
      expect(mockSendBeacon).not.toHaveBeenCalled();

      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/styles.css";
      const stylesheetEvent = new Event("error");
      Object.defineProperty(stylesheetEvent, "target", { value: stylesheet });
      handlers.error!(stylesheetEvent);
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("clamps URL-derived fields to the schema boundary", () => {
      const target = document.createElement("script");
      target.src = `https://cdn.example.com/${"x".repeat(700)}.js`;
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      const { handlers } = captureListeners();
      handlers.error!(event);
      const beacon = mockSendBeacon.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(() => parseBeacon(beacon)).not.toThrow();
      expect(String(beacon.url).length).toBeLessThanOrEqual(500);
    });

    it("does not read Resource Timing for a resource excluded by the report gate", () => {
      mockGetOptions.mockReturnValue({ ...DEFAULT_OPTIONS, resources: { report: "none" } });
      const target = document.createElement("img");
      target.src = "https://cdn.example.com/image.png";
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      const { handlers } = captureListeners();

      handlers.error!(event);

      expect(mockGetResourceTimingInfo).not.toHaveBeenCalled();
    });

    it("clamps the page URL context for regular resource reports", () => {
      const originalUrl = window.location.href;
      window.history.replaceState(null, "", `/?query=${"x".repeat(700)}`);
      const target = document.createElement("script");
      target.src = "https://cdn.example.com/app.js";
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });
      const { handlers } = captureListeners();

      try {
        handlers.error!(event);

        const beacon = mockSendBeacon.mock.calls[0]?.[0];
        expect(() => parseBeacon(beacon)).not.toThrow();
        expect(beacon?.errorContext).toHaveLength(500);
      } finally {
        window.history.replaceState(null, "", originalUrl);
      }
    });

    it("clamps the page URL context for static asset reports", () => {
      const originalUrl = window.location.href;
      window.history.replaceState(null, "", `/?query=${"x".repeat(700)}`);
      mockIsStaticAssetError.mockReturnValue(true);
      mockIsLikely404.mockReturnValue(true);
      mockGetAssetUrl.mockReturnValue("https://cdn.example.com/app.abc123.js");
      const { handlers } = captureListeners();
      const target = document.createElement("script");
      target.src = "https://cdn.example.com/app.abc123.js";
      const event = new Event("error");
      Object.defineProperty(event, "target", { value: target });

      try {
        handlers.error!(event);

        const beacon = mockSendBeacon.mock.calls[0]?.[0];
        expect(() => parseBeacon(beacon)).not.toThrow();
        expect(beacon?.errorContext).toHaveLength(500);
      } finally {
        window.history.replaceState(null, "", originalUrl);
      }
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

    it("sends beacon with describeError(event.reason) as errorMessage", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      const reason = new Error("Promise rejection message");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "Error: Promise rejection message" }),
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

    it("delegates to triggerRetry with chunk-error source for chunk rejection reasons", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const reason = new Error("ChunkLoadError");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: reason, source: "chunk-error" }),
      );
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

    it("does not call logger.capturedError when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("ignored") });
      expect(mockLogger.capturedError).not.toHaveBeenCalled();
    });

    it("calls logger.capturedError with type and event when rejection is not ignored", () => {
      mockShouldIgnoreMessages.mockReturnValue(false);
      const { handlers } = captureListeners();
      const event = { preventDefault: vi.fn(), reason: new Error("visible") };
      handlers.unhandledrejection!(event);
      expect(mockLogger.capturedError).toHaveBeenCalledWith("unhandledrejection", event);
    });

    it("does not call sendBeacon when shouldIgnoreMessages returns true", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers, mockSerialize } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("ignored") });
      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockSerialize).not.toHaveBeenCalled();
    });

    it("does not call triggerRetry when shouldIgnoreMessages returns true", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("ignored") });
      expect(mockTriggerRetry).not.toHaveBeenCalled();
    });

    it("does not call preventDefault when shouldIgnoreMessages returns true", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.unhandledrejection!({
        preventDefault: mockPreventDefault,
        reason: new Error("ignored"),
      });
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it("shouldIgnore takes priority over isChunkError and shouldForceRetry", () => {
      mockIsChunkError.mockReturnValue(true);
      mockShouldForceRetry.mockReturnValue(true);
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason: new Error("ignored") });
      expect(mockIsChunkError).not.toHaveBeenCalled();
      expect(mockShouldForceRetry).not.toHaveBeenCalled();
      expect(mockTriggerRetry).not.toHaveBeenCalled();
      expect(mockSendBeacon).not.toHaveBeenCalled();
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

    it("handles an Error whose message getter throws", () => {
      const reason = new Error("hidden");
      Object.defineProperty(reason, "message", {
        get: () => {
          throw new Error("blocked");
        },
      });
      const { handlers } = captureListeners();

      expect(() => {
        handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      }).not.toThrow();
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "Error rejection" }),
      );
    });

    it("checks ignore patterns against both the raw message and Error prefix", () => {
      const { handlers } = captureListeners();
      const reason = new TypeError("my rejection");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockShouldIgnoreMessages).toHaveBeenCalledWith([
        "my rejection",
        "TypeError: my rejection",
      ]);
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

    it("does not call logger.capturedError when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockLogger.capturedError).not.toHaveBeenCalled();
    });

    it("calls logger.capturedError with csp type and details when CSP violation is not ignored", () => {
      mockShouldIgnoreMessages.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockLogger.capturedError).toHaveBeenCalledWith(
        "csp",
        "https://evil.com",
        "script-src",
      );
    });

    it("does not call sendBeacon when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers, mockSerialize } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockSerialize).not.toHaveBeenCalled();
    });

    it("does not call triggerRetry for CSP violations", () => {
      const { handlers } = captureListeners();
      handlers.securitypolicyviolation!({
        blockedURI: "https://evil.com",
        preventDefault: vi.fn(),
        violatedDirective: "script-src",
      });
      expect(mockTriggerRetry).not.toHaveBeenCalled();
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

    it("delegates to triggerRetry with vite:preloadError source and payload as error", () => {
      const { handlers } = captureListeners();
      const event = { payload: { message: "preload error" }, preventDefault: vi.fn() };
      handlers["vite:preloadError"]!(event);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: event.payload, source: "vite:preloadError" }),
      );
    });

    it("does not call sendBeacon - always delegates to triggerRetry", () => {
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

    it("does not call logger.capturedError when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        payload: { message: "ignored chunk error" },
        preventDefault: vi.fn(),
      });
      expect(mockLogger.capturedError).not.toHaveBeenCalled();
    });

    it("does not call triggerRetry when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers["vite:preloadError"]!({
        payload: { message: "ignored chunk error" },
        preventDefault: vi.fn(),
      });
      expect(mockTriggerRetry).not.toHaveBeenCalled();
    });

    it("does not call preventDefault when shouldIgnoreMessages returns true", () => {
      mockShouldIgnoreMessages.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers["vite:preloadError"]!({
        payload: { message: "ignored chunk error" },
        preventDefault: mockPreventDefault,
      });
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it("calls logger.capturedError with type and event when error is not ignored", () => {
      mockShouldIgnoreMessages.mockReturnValue(false);
      const { handlers } = captureListeners();
      const event = {
        payload: { message: "visible chunk error" },
        preventDefault: vi.fn(),
      };
      handlers["vite:preloadError"]!(event);
      expect(mockLogger.capturedError).toHaveBeenCalledWith("vite:preloadError", event);
    });

    it("falls back to event as error when payload is undefined", () => {
      const { handlers } = captureListeners();
      const event = { payload: undefined, preventDefault: vi.fn() };
      expect(() => handlers["vite:preloadError"]!(event)).not.toThrow();
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: event, source: "vite:preloadError" }),
      );
    });
  });

  describe("logger graceful degradation", () => {
    it("does not throw when getLogger returns undefined (no logger set)", () => {
      mockGetLogger.mockReset();
      const { handlers } = captureListeners();
      expect(() => {
        handlers.error!({ message: "test error", preventDefault: vi.fn() });
      }).not.toThrow();
    });

    it("still processes events normally when no logger is set", () => {
      mockGetLogger.mockReset();
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "test error", preventDefault: vi.fn() });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });
  });

  describe("chunk error → orchestrator delegation", () => {
    it("window error event with chunk error delegates to triggerRetry (not sendBeacon)", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({
        message: "Failed to fetch dynamically imported module",
        preventDefault: vi.fn(),
      });
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("unhandledrejection with chunk error reason delegates to triggerRetry with the reason", () => {
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const reason = new Error("ChunkLoadError");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: reason, source: "chunk-error" }),
      );
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("vite:preloadError always delegates to triggerRetry with payload (does not check isChunkError)", () => {
      // vite:preloadError handler doesn't call isChunkError - it always delegates
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      const event = { payload: { message: "vite preload" }, preventDefault: vi.fn() };
      handlers["vite:preloadError"]!(event);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: event.payload, source: "vite:preloadError" }),
      );
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
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation(() => {});
      const result = listenInternal(vi.fn());
      spy.mockRestore();
      expect(result).toBeUndefined();
    });

    it("calling listenInternal twice registers each listener type twice", () => {
      const registeredTypes: string[] = [];
      const spy = vi.spyOn(globalThis, "addEventListener").mockImplementation((type: string) => {
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

    it("preserves the historical string description for null rejection reason", () => {
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

  describe("forceRetry errors delegate to orchestrator", () => {
    it("delegates to triggerRetry with force-retry source when error message matches forceRetry pattern", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      const innerError = new Error("StaleModule detected");
      const event = { error: innerError, message: "StaleModule detected", preventDefault: vi.fn() };
      handlers.error!(event);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: innerError, source: "force-retry" }),
      );
    });

    it("calls event.preventDefault() for forceRetry error events", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.error!({ message: "StaleModule", preventDefault: mockPreventDefault });
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    it("does not call sendBeacon for forceRetry error events", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.error!({ message: "StaleModule", preventDefault: vi.fn() });
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("checks shouldForceRetry with event.message for error events", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "my custom error", preventDefault: vi.fn() });
      expect(mockShouldForceRetry).toHaveBeenCalledWith(["my custom error"]);
    });

    it("delegates to triggerRetry with force-retry source when unhandledrejection matches forceRetry", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      const reason = new Error("VersionMismatch");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: reason, source: "force-retry" }),
      );
    });

    it("calls event.preventDefault() for forceRetry unhandledrejection events", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.unhandledrejection!({
        preventDefault: mockPreventDefault,
        reason: new Error("VersionMismatch"),
      });
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    it("does not call sendBeacon for forceRetry unhandledrejection events", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({
        preventDefault: vi.fn(),
        reason: new Error("VersionMismatch"),
      });
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("checks shouldForceRetry with the raw rejection message", () => {
      mockIsChunkError.mockReturnValue(false);
      const { handlers } = captureListeners();
      const reason = new Error("my rejection __SPA_GUARD_FORCE_RETRY__");
      handlers.unhandledrejection!({ preventDefault: vi.fn(), reason });
      expect(mockShouldForceRetry).toHaveBeenCalledWith([
        reason.message,
        `Error: ${reason.message}`,
      ]);
    });

    it("chunk errors take priority over forceRetry (isChunkError checked first)", () => {
      mockIsChunkError.mockReturnValue(true);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      const innerError = new Error("ChunkLoadError");
      const event = { error: innerError, message: "ChunkLoadError", preventDefault: vi.fn() };
      handlers.error!(event);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: innerError, source: "chunk-error" }),
      );
      // shouldForceRetry is not even checked since isChunkError returns first
      expect(mockShouldForceRetry).not.toHaveBeenCalled();
    });

    it("non-matching errors still send beacons normally", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.error!({ message: "regular error", preventDefault: vi.fn() });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      expect(mockTriggerRetry).not.toHaveBeenCalled();
    });

    it("non-matching rejections send beacons and delegate to orchestrator with default config", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({
        preventDefault: vi.fn(),
        reason: new Error("regular rejection"),
      });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleUnhandledRejections config", () => {
    it("retry:true + sendBeacon:true (default) sends beacon first, then delegates to orchestrator", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      const reason = new Error("test rejection");
      handlers.unhandledrejection!({
        preventDefault: mockPreventDefault,
        reason,
      });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Error: test rejection",
          eventName: "unhandledrejection",
        }),
      );
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: reason, source: "unhandled-rejection" }),
      );
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
      // Beacon is sent before triggerRetry
      const sendBeaconOrder = mockSendBeacon.mock.invocationCallOrder[0]!;
      const triggerRetryOrder = mockTriggerRetry.mock.invocationCallOrder[0]!;
      expect(sendBeaconOrder).toBeLessThan(triggerRetryOrder);
    });

    it("retry:true + sendBeacon:false only delegates to orchestrator, no beacon", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { retry: true, sendBeacon: false },
      });
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      const reason = new Error("test rejection");
      handlers.unhandledrejection!({
        preventDefault: mockPreventDefault,
        reason,
      });
      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: reason, source: "unhandled-rejection" }),
      );
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
    });

    it("retry:false + sendBeacon:true only sends beacon, no retry delegation", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { retry: false, sendBeacon: true },
      });
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      const reason = new Error("test rejection");
      handlers.unhandledrejection!({
        preventDefault: mockPreventDefault,
        reason,
      });
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Error: test rejection",
          eventName: "unhandledrejection",
        }),
      );
      expect(mockTriggerRetry).not.toHaveBeenCalled();
      expect(mockPreventDefault).not.toHaveBeenCalled();
    });

    it("retry:false + sendBeacon:false does nothing beyond logging", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { retry: false, sendBeacon: false },
      });
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      handlers.unhandledrejection!({
        preventDefault: mockPreventDefault,
        reason: new Error("test rejection"),
      });
      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockTriggerRetry).not.toHaveBeenCalled();
      expect(mockPreventDefault).not.toHaveBeenCalled();
      // logger.capturedError is still called
      expect(mockLogger.capturedError).toHaveBeenCalledWith(
        "unhandledrejection",
        expect.any(Object),
      );
    });

    it("calls event.preventDefault() only when retry is enabled", () => {
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);

      // With retry:true
      const { handlers: handlers1 } = captureListeners();
      const pd1 = vi.fn();
      handlers1.unhandledrejection!({ preventDefault: pd1, reason: new Error("test") });
      expect(pd1).toHaveBeenCalledTimes(1);

      // With retry:false
      vi.clearAllMocks();
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      mockIsInitialized.mockReturnValue(false);
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { retry: false, sendBeacon: true },
      });
      mockGetRetryInfoForBeacon.mockReturnValue({});
      mockGetLogger.mockReturnValue(mockLogger);
      mockShouldIgnoreMessages.mockReturnValue(false);
      const { handlers: handlers2 } = captureListeners();
      const pd2 = vi.fn();
      handlers2.unhandledrejection!({ preventDefault: pd2, reason: new Error("test") });
      expect(pd2).not.toHaveBeenCalled();
    });

    it("chunk errors bypass handleUnhandledRejections config entirely", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { retry: false, sendBeacon: false },
      });
      mockIsChunkError.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      const reason = new Error("ChunkLoadError");
      handlers.unhandledrejection!({ preventDefault: mockPreventDefault, reason });
      // Chunk errors always delegate to orchestrator and call preventDefault regardless of config
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: reason, source: "chunk-error" }),
      );
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("ForceRetry errors bypass handleUnhandledRejections config entirely", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { retry: false, sendBeacon: false },
      });
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(true);
      const { handlers } = captureListeners();
      const mockPreventDefault = vi.fn();
      const reason = new Error("ForceRetryError");
      handlers.unhandledrejection!({ preventDefault: mockPreventDefault, reason });
      // ForceRetry errors always delegate to orchestrator and call preventDefault regardless of config
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ error: reason, source: "force-retry" }),
      );
      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("partial config: only retry specified, sendBeacon uses default (true)", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { retry: false },
      });
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({
        preventDefault: vi.fn(),
        reason: new Error("test"),
      });
      // sendBeacon defaults to true when not specified
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      expect(mockTriggerRetry).not.toHaveBeenCalled();
    });

    it("partial config: only sendBeacon specified, retry uses default (true)", () => {
      mockGetOptions.mockReturnValue({
        ...DEFAULT_OPTIONS,
        handleUnhandledRejections: { sendBeacon: false },
      });
      mockIsChunkError.mockReturnValue(false);
      mockShouldForceRetry.mockReturnValue(false);
      const { handlers } = captureListeners();
      handlers.unhandledrejection!({
        preventDefault: vi.fn(),
        reason: new Error("test"),
      });
      // retry defaults to true when not specified
      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });
  });
});
