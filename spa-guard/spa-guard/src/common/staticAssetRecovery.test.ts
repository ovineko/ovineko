import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("./retryOrchestrator", () => ({
  triggerRetry: vi.fn(),
}));

import { getOptions } from "./options";
import { triggerRetry } from "./retryOrchestrator";
import { handleStaticAssetFailure, resetStaticAssetRecovery } from "./staticAssetRecovery";

const mockGetOptions = vi.mocked(getOptions);
const mockTriggerRetry = vi.mocked(triggerRetry);

describe("staticAssetRecovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetOptions.mockReturnValue({
      staticAssets: {
        autoRecover: true,
        recoveryDelay: 500,
      },
    });
    mockTriggerRetry.mockReturnValue({ status: "accepted" });
    resetStaticAssetRecovery();
  });

  afterEach(() => {
    resetStaticAssetRecovery();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("handleStaticAssetFailure", () => {
    it("does not call triggerRetry immediately", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      expect(mockTriggerRetry).not.toHaveBeenCalled();
    });

    it("calls triggerRetry with cacheBust and source after delay for single failure", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ cacheBust: true, source: "static-asset-error" }),
      );
    });

    it("error message includes the failed asset URL", () => {
      const url = "https://example.com/assets/index-Bd0Ef7jk.js";
      handleStaticAssetFailure(url);
      vi.advanceTimersByTime(500);
      const call = mockTriggerRetry.mock.calls[0]![0];
      expect((call.error as Error).message).toContain(url);
    });

    it("collects multiple failures within delay and triggers a single reload", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      handleStaticAssetFailure("https://example.com/assets/vendor-abc12345.css");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });

    it("does not schedule duplicate timers for concurrent failures", () => {
      handleStaticAssetFailure("https://example.com/assets/chunk1-abc12345.js");
      handleStaticAssetFailure("https://example.com/assets/chunk2-def67890.js");
      handleStaticAssetFailure("https://example.com/assets/chunk3-ghi12345.css");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });

    it("uses recoveryDelay from options", () => {
      mockGetOptions.mockReturnValue({
        staticAssets: { autoRecover: true, recoveryDelay: 1000 },
      });
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(999);
      expect(mockTriggerRetry).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });

    it("uses default 500ms delay when staticAssets config is absent", () => {
      mockGetOptions.mockReturnValue({});
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(499);
      expect(mockTriggerRetry).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });

    it("allows a new reload after the previous timer fires and resets state", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);

      // Trigger another failure after the first cycle completes
      handleStaticAssetFailure("https://example.com/assets/vendor-abc12345.js");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(2);
    });

    it("delegates fallback mode handling to orchestrator", () => {
      // triggerRetry returns fallback status — no error thrown, caller is not responsible
      mockTriggerRetry.mockReturnValue({ status: "fallback" });
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
      expect(mockTriggerRetry).toHaveBeenCalledWith(
        expect.objectContaining({ source: "static-asset-error" }),
      );
    });

    it("delegates storm dedupe to orchestrator", () => {
      // triggerRetry returns deduped status — no error thrown, burst handled by orchestrator
      mockTriggerRetry.mockReturnValue({ reason: "already-scheduled", status: "deduped" });
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when window is undefined (SSR)", () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: undefined,
        writable: true,
      });
      try {
        expect(() =>
          handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js"),
        ).not.toThrow();
        vi.advanceTimersByTime(500);
        expect(mockTriggerRetry).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: originalWindow,
          writable: true,
        });
      }
    });
  });

  describe("resetStaticAssetRecovery", () => {
    it("cancels a pending timer so triggerRetry is never called", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      resetStaticAssetRecovery();
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).not.toHaveBeenCalled();
    });

    it("is safe to call when no timer is pending", () => {
      expect(() => resetStaticAssetRecovery()).not.toThrow();
    });

    it("clears failed assets so subsequent failures start fresh", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      resetStaticAssetRecovery();
      // New failure after reset should work normally
      handleStaticAssetFailure("https://example.com/assets/vendor-abc12345.js");
      vi.advanceTimersByTime(500);
      expect(mockTriggerRetry).toHaveBeenCalledTimes(1);
    });
  });
});
