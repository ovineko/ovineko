import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./events/internal", () => ({
  getLogger: vi.fn(),
}));

vi.mock("./options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("./shouldIgnore", () => ({
  shouldIgnoreBeacon: vi.fn(),
}));

import { getLogger } from "./events/internal";
import { getOptions } from "./options";
import { sendBeacon } from "./sendBeacon";
import { shouldIgnoreBeacon } from "./shouldIgnore";

const mockGetLogger = vi.mocked(getLogger);
const mockGetOptions = vi.mocked(getOptions);
const mockShouldIgnoreBeacon = vi.mocked(shouldIgnoreBeacon);

const DEFAULT_ENDPOINT = "https://example.com/beacon";

const makeBeacon = (overrides = {}) => ({
  errorMessage: "test error",
  eventName: "test-event",
  ...overrides,
});

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
  retryLimitExceeded: vi.fn(),
  updatedRetryAttempt: vi.fn(),
  versionChanged: vi.fn(),
  versionChangeDetected: vi.fn(),
  versionCheckAlreadyRunning: vi.fn(),
  versionCheckDisabled: vi.fn(),
  versionCheckFailed: vi.fn(),
  versionCheckHttpError: vi.fn(),
  versionCheckParseError: vi.fn(),
  versionCheckRequiresEndpoint: vi.fn(),
  versionCheckStarted: vi.fn(),
  versionCheckStopped: vi.fn(),
  warn: vi.fn(),
});

describe("sendBeacon", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockShouldIgnoreBeacon.mockReturnValue(false);
    mockGetOptions.mockReturnValue({
      reportBeacon: { endpoint: DEFAULT_ENDPOINT },
    });

    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    mockLogger = createMockLogger();
    mockGetLogger.mockReturnValue(mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("shouldIgnoreBeacon check", () => {
    beforeEach(() => {
      vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    });

    it("returns early without any action when shouldIgnoreBeacon returns true", () => {
      mockShouldIgnoreBeacon.mockReturnValue(true);

      sendBeacon(makeBeacon());

      expect(mockGetOptions).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("proceeds when shouldIgnoreBeacon returns false", () => {
      mockShouldIgnoreBeacon.mockReturnValue(false);

      sendBeacon(makeBeacon());

      expect(mockGetOptions).toHaveBeenCalledTimes(1);
    });

    it("calls shouldIgnoreBeacon with the beacon object", () => {
      const beacon = makeBeacon({ errorMessage: "specific error" });

      sendBeacon(beacon);

      expect(mockShouldIgnoreBeacon).toHaveBeenCalledWith(beacon);
    });

    it("does not call shouldIgnoreBeacon more than once per sendBeacon call", () => {
      sendBeacon(makeBeacon());

      expect(mockShouldIgnoreBeacon).toHaveBeenCalledTimes(1);
    });
  });

  describe("beacon endpoint construction", () => {
    let sendBeaconSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      sendBeaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    });

    it("uses reportBeacon.endpoint from options", () => {
      mockGetOptions.mockReturnValue({
        reportBeacon: { endpoint: "https://api.example.com/errors" },
      });

      sendBeacon(makeBeacon());

      expect(sendBeaconSpy).toHaveBeenCalledWith(
        "https://api.example.com/errors",
        expect.any(String),
      );
    });

    it("calls noBeaconEndpoint and returns early when endpoint is not configured", () => {
      mockGetOptions.mockReturnValue({ reportBeacon: {} });

      sendBeacon(makeBeacon());

      expect(mockLogger.noBeaconEndpoint).toHaveBeenCalledTimes(1);
      expect(sendBeaconSpy).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("calls noBeaconEndpoint and returns early when reportBeacon is undefined", () => {
      mockGetOptions.mockReturnValue({});

      sendBeacon(makeBeacon());

      expect(mockLogger.noBeaconEndpoint).toHaveBeenCalledTimes(1);
      expect(sendBeaconSpy).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("handles endpoint being an empty string (treats as falsy, calls noBeaconEndpoint)", () => {
      mockGetOptions.mockReturnValue({ reportBeacon: { endpoint: "" } });

      sendBeacon(makeBeacon());

      expect(mockLogger.noBeaconEndpoint).toHaveBeenCalledTimes(1);
      expect(sendBeaconSpy).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("calls getOptions exactly once per sendBeacon call (when not ignored)", () => {
      sendBeacon(makeBeacon());

      expect(mockGetOptions).toHaveBeenCalledTimes(1);
    });

    it("does not call getOptions when beacon is ignored", () => {
      mockShouldIgnoreBeacon.mockReturnValue(true);

      sendBeacon(makeBeacon());

      expect(mockGetOptions).not.toHaveBeenCalled();
    });
  });

  describe("beacon payload structure", () => {
    let sendBeaconSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      sendBeaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    });

    it("sends the beacon as JSON string", () => {
      const beacon = makeBeacon();

      sendBeacon(beacon);

      const sentBody = sendBeaconSpy.mock.calls[0]?.[1];
      expect(typeof sentBody).toBe("string");
      expect(() => JSON.parse(sentBody as string)).not.toThrow();
    });

    it("JSON encodes the full beacon object", () => {
      const beacon = makeBeacon({
        errorMessage: "chunk error",
        eventName: "chunk-load-error",
        retryAttempt: 2,
        retryId: "retry-abc-123",
        serialized: '{"type":"Error"}',
      });

      sendBeacon(beacon);

      const sentBody = sendBeaconSpy.mock.calls[0]?.[1];
      const parsed = JSON.parse(sentBody as string);
      expect(parsed).toEqual(beacon);
    });

    it("sends beacon with only the fields provided (no extra fields added)", () => {
      const beacon = { eventName: "minimal-event" };

      sendBeacon(beacon);

      const sentBody = sendBeaconSpy.mock.calls[0]?.[1];
      const parsed = JSON.parse(sentBody as string);
      expect(parsed).toEqual({ eventName: "minimal-event" });
    });

    it("handles empty beacon object", () => {
      sendBeacon({});

      const sentBody = sendBeaconSpy.mock.calls[0]?.[1];
      expect(sentBody).toBe("{}");
    });
  });

  describe("navigator.sendBeacon invocation", () => {
    let sendBeaconSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      sendBeaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    });

    it("calls navigator.sendBeacon with endpoint and JSON body", () => {
      const beacon = makeBeacon();

      sendBeacon(beacon);

      expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
      expect(sendBeaconSpy).toHaveBeenCalledWith(DEFAULT_ENDPOINT, JSON.stringify(beacon));
    });

    it("does not call fetch when navigator.sendBeacon succeeds (returns true)", () => {
      sendBeaconSpy.mockReturnValue(true);

      sendBeacon(makeBeacon());

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("falls back to fetch when navigator.sendBeacon returns false", () => {
      sendBeaconSpy.mockReturnValue(false);

      sendBeacon(makeBeacon());

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetch fallback when sendBeacon returns false", () => {
    beforeEach(() => {
      vi.spyOn(navigator, "sendBeacon").mockReturnValue(false);
    });

    it("calls fetch when navigator.sendBeacon returns false", () => {
      sendBeacon(makeBeacon());

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("calls fetch with POST method and keepalive when sendBeacon returns false", () => {
      const beacon = makeBeacon();

      sendBeacon(beacon);

      expect(fetchMock).toHaveBeenCalledWith(DEFAULT_ENDPOINT, {
        body: JSON.stringify(beacon),
        keepalive: true,
        method: "POST",
      });
    });

    it("calls beaconSendFailed when fetch rejects", async () => {
      const fetchError = new Error("network offline");
      fetchMock.mockRejectedValue(fetchError);

      sendBeacon(makeBeacon());

      await vi.waitFor(() => {
        expect(mockLogger.beaconSendFailed).toHaveBeenCalledWith(fetchError);
      });
    });

    it("does not throw when fetch rejects (error is caught internally)", async () => {
      fetchMock.mockRejectedValue(new Error("network offline"));

      expect(() => sendBeacon(makeBeacon())).not.toThrow();

      await vi.waitFor(() => {
        expect(mockLogger.beaconSendFailed).toHaveBeenCalled();
      });
    });
  });

  describe("fetch fallback when sendBeacon unavailable", () => {
    let originalSendBeacon: typeof navigator.sendBeacon;

    beforeEach(() => {
      originalSendBeacon = navigator.sendBeacon;
      Object.defineProperty(window.navigator, "sendBeacon", {
        configurable: true,
        value: undefined,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window.navigator, "sendBeacon", {
        configurable: true,
        value: originalSendBeacon,
        writable: true,
      });
    });

    it("calls fetch when navigator.sendBeacon is not a function", () => {
      sendBeacon(makeBeacon());

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("calls fetch with correct endpoint, body, method, and keepalive", () => {
      const beacon = makeBeacon();

      sendBeacon(beacon);

      expect(fetchMock).toHaveBeenCalledWith(DEFAULT_ENDPOINT, {
        body: JSON.stringify(beacon),
        keepalive: true,
        method: "POST",
      });
    });

    it("calls fetch with the correct JSON body when sendBeacon unavailable", () => {
      const beacon = makeBeacon({ retryAttempt: 3, retryId: "id-xyz" });

      sendBeacon(beacon);

      const fetchCall = fetchMock.mock.calls[0]?.[1];
      expect(fetchCall?.body).toBe(JSON.stringify(beacon));
    });
  });

  describe("SSR / non-browser environment", () => {
    let originalWindow: typeof globalThis.window;

    beforeEach(() => {
      originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: undefined,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
        writable: true,
      });
    });

    it("falls back to fetch when window is undefined", () => {
      sendBeacon(makeBeacon());

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("calls fetch with correct options when window is undefined", () => {
      const beacon = makeBeacon();

      sendBeacon(beacon);

      expect(fetchMock).toHaveBeenCalledWith(DEFAULT_ENDPOINT, {
        body: JSON.stringify(beacon),
        keepalive: true,
        method: "POST",
      });
    });
  });

  describe("error serialization integration", () => {
    let sendBeaconSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      sendBeaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    });

    it("sends the full beacon payload including serialized field", () => {
      const beacon = makeBeacon({
        serialized: '{"type":"Error","message":"Failed to fetch module"}',
      });

      sendBeacon(beacon);

      const sentBody = sendBeaconSpy.mock.calls[0]?.[1];
      const parsed = JSON.parse(sentBody as string);
      expect(parsed.serialized).toBe('{"type":"Error","message":"Failed to fetch module"}');
    });

    it("sends retryAttempt and retryId when present in beacon", () => {
      const beacon = makeBeacon({ retryAttempt: 2, retryId: "retry-abc" });

      sendBeacon(beacon);

      const sentBody = sendBeaconSpy.mock.calls[0]?.[1];
      const parsed = JSON.parse(sentBody as string);
      expect(parsed.retryAttempt).toBe(2);
      expect(parsed.retryId).toBe("retry-abc");
    });
  });

  describe("Logger method calls", () => {
    it("calls noBeaconEndpoint when no endpoint is configured", () => {
      mockGetOptions.mockReturnValue({});

      sendBeacon(makeBeacon());

      expect(mockLogger.noBeaconEndpoint).toHaveBeenCalledTimes(1);
    });

    it("calls beaconSendFailed with the error when fetch fails", async () => {
      vi.spyOn(navigator, "sendBeacon").mockReturnValue(false);
      const fetchError = new Error("network failure");
      fetchMock.mockRejectedValue(fetchError);

      sendBeacon(makeBeacon());

      await vi.waitFor(() => {
        expect(mockLogger.beaconSendFailed).toHaveBeenCalledWith(fetchError);
      });
    });

    it("does not call Logger methods when no logger is set", () => {
      mockGetLogger.mockReturnValue();
      mockGetOptions.mockReturnValue({});

      sendBeacon(makeBeacon());

      expect(mockLogger.noBeaconEndpoint).not.toHaveBeenCalled();
    });

    it("does not call noBeaconEndpoint when endpoint is configured", () => {
      vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);

      sendBeacon(makeBeacon());

      expect(mockLogger.noBeaconEndpoint).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    let sendBeaconSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      sendBeaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    });

    it("handles beacon with only eventMessage (no errorMessage)", () => {
      const beacon = { eventMessage: "script error occurred" };

      sendBeacon(beacon);

      expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
      const sentBody = sendBeaconSpy.mock.calls[0]?.[1];
      const parsed = JSON.parse(sentBody as string);
      expect(parsed.eventMessage).toBe("script error occurred");
    });

    it("handles empty beacon object without throwing", () => {
      expect(() => sendBeacon({})).not.toThrow();
    });

    it("does not call sendBeacon when no endpoint is configured", () => {
      mockGetOptions.mockReturnValue({ reportBeacon: {} });

      sendBeacon(makeBeacon());

      expect(sendBeaconSpy).not.toHaveBeenCalled();
    });
  });
});
