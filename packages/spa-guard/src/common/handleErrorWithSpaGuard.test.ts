import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./isChunkError", () => ({
  isChunkError: vi.fn(),
}));

vi.mock("./reload", () => ({
  attemptReload: vi.fn(),
}));

vi.mock("./retryState", () => ({
  getRetryInfoForBeacon: vi.fn(),
}));

vi.mock("./sendBeacon", () => ({
  sendBeacon: vi.fn(),
}));

vi.mock("./serializeError", () => ({
  serializeError: vi.fn(),
}));

import { handleErrorWithSpaGuard } from "./handleErrorWithSpaGuard";
import { isChunkError } from "./isChunkError";
import { attemptReload } from "./reload";
import { getRetryInfoForBeacon } from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { serializeError } from "./serializeError";

const mockIsChunkError = vi.mocked(isChunkError);
const mockAttemptReload = vi.mocked(attemptReload);
const mockGetRetryInfoForBeacon = vi.mocked(getRetryInfoForBeacon);
const mockSendBeacon = vi.mocked(sendBeacon);
const mockSerializeError = vi.mocked(serializeError);

describe("handleErrorWithSpaGuard", () => {
  beforeEach(() => {
    mockIsChunkError.mockReturnValue(false);
    mockAttemptReload.mockReset();
    mockGetRetryInfoForBeacon.mockReturnValue({});
    mockSendBeacon.mockReset();
    mockSerializeError.mockReturnValue('{"serialized":"error"}');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("chunk error → attemptReload path", () => {
    it("calls attemptReload when isChunkError returns true and autoRetryChunkErrors is true (default)", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("Failed to fetch dynamically imported module");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
      expect(mockAttemptReload).toHaveBeenCalledWith(error);
    });

    it("calls attemptReload when isChunkError=true and autoRetryChunkErrors=true (explicit)", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("ChunkLoadError");

      handleErrorWithSpaGuard(error, { autoRetryChunkErrors: true, eventName: "test-event" });

      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
      expect(mockAttemptReload).toHaveBeenCalledWith(error);
    });

    it("does not call sendBeacon when chunk error triggers reload", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("Failed to fetch dynamically imported module");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("calls attemptReload with the original error object (not a copy)", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("chunk error");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockAttemptReload).toHaveBeenCalledWith(error);
      expect(mockAttemptReload.mock.calls[0]![0]).toBe(error);
    });
  });

  describe("non-chunk error → sendBeacon path", () => {
    it("calls sendBeacon when isChunkError returns false and sendBeaconOnError is true (default)", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("Regular error");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });

    it("does not call attemptReload for non-chunk errors", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("Regular error");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockAttemptReload).not.toHaveBeenCalled();
    });

    it("passes eventName to sendBeacon", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("some error");

      handleErrorWithSpaGuard(error, { eventName: "my-custom-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "my-custom-event" }),
      );
    });

    it("passes error.message as errorMessage to sendBeacon for Error instances", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("specific error message");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "specific error message" }),
      );
    });

    it("passes String(error) as errorMessage to sendBeacon for non-Error values", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = "string error value";

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "string error value" }),
      );
    });

    it("includes retry info from getRetryInfoForBeacon in the beacon payload", () => {
      mockIsChunkError.mockReturnValue(false);
      mockGetRetryInfoForBeacon.mockReturnValue({ retryAttempt: 2, retryId: "retry-123" });
      const error = new Error("some error");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ retryAttempt: 2, retryId: "retry-123" }),
      );
    });

    it("calls sendBeacon when isChunkError=true but autoRetryChunkErrors=false", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("ChunkLoadError");

      handleErrorWithSpaGuard(error, { autoRetryChunkErrors: false, eventName: "test-event" });

      expect(mockAttemptReload).not.toHaveBeenCalled();
      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    });
  });

  describe("ignored errors → no action taken", () => {
    it("does not call attemptReload or sendBeacon when sendBeaconOnError=false and not a chunk error", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("some error");

      handleErrorWithSpaGuard(error, { eventName: "test-event", sendBeaconOnError: false });

      expect(mockAttemptReload).not.toHaveBeenCalled();
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("does not call attemptReload or sendBeacon when autoRetryChunkErrors=false and sendBeaconOnError=false", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("ChunkLoadError");

      handleErrorWithSpaGuard(error, {
        autoRetryChunkErrors: false,
        eventName: "test-event",
        sendBeaconOnError: false,
      });

      expect(mockAttemptReload).not.toHaveBeenCalled();
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });

    it("does not call sendBeacon when chunk error triggers reload (only one path taken)", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("Failed to fetch dynamically imported module");

      handleErrorWithSpaGuard(error, {
        autoRetryChunkErrors: true,
        eventName: "test-event",
        sendBeaconOnError: true,
      });

      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
      expect(mockSendBeacon).not.toHaveBeenCalled();
    });
  });

  describe("error serialization before passing to beacon", () => {
    it("calls serializeError with the error when no errorInfo provided", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("serialization test");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSerializeError).toHaveBeenCalledWith(error);
    });

    it("calls serializeError with {error, errorInfo} object when errorInfo is provided", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("with error info");
      const errorInfo = { componentStack: "in Component\n  at App" } as React.ErrorInfo;

      handleErrorWithSpaGuard(error, { errorInfo, eventName: "test-event" });

      expect(mockSerializeError).toHaveBeenCalledWith({ error, errorInfo });
    });

    it("passes serialized result to sendBeacon", () => {
      mockIsChunkError.mockReturnValue(false);
      mockSerializeError.mockReturnValue('{"type":"Error","message":"test"}');
      const error = new Error("serialization test");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ serialized: '{"type":"Error","message":"test"}' }),
      );
    });

    it("does not call serializeError when chunk error triggers reload (sendBeacon not called)", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("ChunkLoadError");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSerializeError).not.toHaveBeenCalled();
    });
  });

  describe("event emission on error handling (onError callback)", () => {
    it("calls onError with the error when provided", () => {
      mockIsChunkError.mockReturnValue(false);
      const onError = vi.fn();
      const error = new Error("callback test");

      handleErrorWithSpaGuard(error, { eventName: "test-event", onError });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it("calls onError before attempting reload or sending beacon", () => {
      mockIsChunkError.mockReturnValue(false);
      const callOrder: string[] = [];
      const onError = vi.fn(() => callOrder.push("onError"));
      mockSendBeacon.mockImplementation(() => callOrder.push("sendBeacon"));
      const error = new Error("order test");

      handleErrorWithSpaGuard(error, { eventName: "test-event", onError });

      expect(callOrder).toEqual(["onError", "sendBeacon"]);
    });

    it("calls onError even when the error is a chunk error triggering reload", () => {
      mockIsChunkError.mockReturnValue(true);
      const onError = vi.fn();
      const error = new Error("Failed to fetch dynamically imported module");

      handleErrorWithSpaGuard(error, { eventName: "test-event", onError });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it("does not throw when onError is not provided", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("no callback");

      expect(() => {
        handleErrorWithSpaGuard(error, { eventName: "test-event" });
      }).not.toThrow();
    });

    it("calls onError with the exact same error reference", () => {
      mockIsChunkError.mockReturnValue(false);
      const onError = vi.fn();
      const error = new Error("reference test");

      handleErrorWithSpaGuard(error, { eventName: "test-event", onError });

      expect(onError.mock.calls[0]![0]).toBe(error);
    });
  });

  describe("edge cases", () => {
    it("handles null error without throwing", () => {
      mockIsChunkError.mockReturnValue(false);

      expect(() => {
        handleErrorWithSpaGuard(null, { eventName: "test-event" });
      }).not.toThrow();
    });

    it("uses String(null) as errorMessage for null error", () => {
      mockIsChunkError.mockReturnValue(false);

      handleErrorWithSpaGuard(null, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "null" }),
      );
    });

    it("handles undefined error without throwing", () => {
      mockIsChunkError.mockReturnValue(false);

      expect(() => {
        handleErrorWithSpaGuard(undefined, { eventName: "test-event" });
      }).not.toThrow();
    });

    it("uses String(undefined) as errorMessage for undefined error", () => {
      mockIsChunkError.mockReturnValue(false);

      handleErrorWithSpaGuard(undefined, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "undefined" }),
      );
    });

    it("handles Error with empty message without throwing", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("placeholder");
      error.message = "";

      expect(() => {
        handleErrorWithSpaGuard(error, { eventName: "test-event" });
      }).not.toThrow();

      expect(mockSendBeacon).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: "" }));
    });

    it("handles non-Error object without throwing", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = { code: 500, detail: "Server error" };

      expect(() => {
        handleErrorWithSpaGuard(error, { eventName: "test-event" });
      }).not.toThrow();
    });

    it("uses String(object) as errorMessage for non-Error object", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = { code: 500 };

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockSendBeacon).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "[object Object]" }),
      );
    });

    it("handles number error value without throwing", () => {
      mockIsChunkError.mockReturnValue(false);

      expect(() => {
        handleErrorWithSpaGuard(42, { eventName: "test-event" });
      }).not.toThrow();

      expect(mockSendBeacon).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: "42" }));
    });

    it("calls isChunkError with the provided error", () => {
      const error = new Error("some error");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockIsChunkError).toHaveBeenCalledWith(error);
    });

    it("calls isChunkError exactly once per handleErrorWithSpaGuard call", () => {
      const error = new Error("some error");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockIsChunkError).toHaveBeenCalledTimes(1);
    });

    it("calls getRetryInfoForBeacon when sending beacon", () => {
      mockIsChunkError.mockReturnValue(false);
      const error = new Error("beacon retry info test");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockGetRetryInfoForBeacon).toHaveBeenCalledTimes(1);
    });

    it("does not call getRetryInfoForBeacon when chunk error triggers reload", () => {
      mockIsChunkError.mockReturnValue(true);
      const error = new Error("chunk error");

      handleErrorWithSpaGuard(error, { eventName: "test-event" });

      expect(mockGetRetryInfoForBeacon).not.toHaveBeenCalled();
    });
  });
});
