import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./options", () => ({
  getOptions: vi.fn(),
}));

vi.mock("./reload", () => ({
  attemptReload: vi.fn(),
}));

vi.mock("./fallbackState", () => ({
  isInFallbackMode: vi.fn(),
}));

import { isInFallbackMode } from "./fallbackState";
import { getOptions } from "./options";
import { attemptReload } from "./reload";
import { handleStaticAssetFailure, resetStaticAssetRecovery } from "./staticAssetRecovery";

const mockGetOptions = vi.mocked(getOptions);
const mockAttemptReload = vi.mocked(attemptReload);
const mockIsInFallbackMode = vi.mocked(isInFallbackMode);

describe("staticAssetRecovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetOptions.mockReturnValue({
      staticAssets: {
        autoRecover: true,
        recoveryDelay: 500,
      },
    });
    mockIsInFallbackMode.mockReturnValue(false);
    resetStaticAssetRecovery();
  });

  afterEach(() => {
    resetStaticAssetRecovery();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("handleStaticAssetFailure", () => {
    it("does not call attemptReload immediately", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      expect(mockAttemptReload).not.toHaveBeenCalled();
    });

    it("calls attemptReload with cacheBust after delay for single failure", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
      expect(mockAttemptReload).toHaveBeenCalledWith(expect.any(Error), { cacheBust: true });
    });

    it("error message includes the failed asset URL", () => {
      const url = "https://example.com/assets/index-Bd0Ef7jk.js";
      handleStaticAssetFailure(url);
      vi.advanceTimersByTime(500);
      const errorArg = mockAttemptReload.mock.calls[0]![0] as Error;
      expect(errorArg.message).toContain(url);
    });

    it("collects multiple failures within delay and triggers a single reload", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      handleStaticAssetFailure("https://example.com/assets/vendor-abc12345.css");
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
    });

    it("does not schedule duplicate timers for concurrent failures", () => {
      handleStaticAssetFailure("https://example.com/assets/chunk1-abc12345.js");
      handleStaticAssetFailure("https://example.com/assets/chunk2-def67890.js");
      handleStaticAssetFailure("https://example.com/assets/chunk3-ghi12345.css");
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
    });

    it("uses recoveryDelay from options", () => {
      mockGetOptions.mockReturnValue({
        staticAssets: { autoRecover: true, recoveryDelay: 1000 },
      });
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(999);
      expect(mockAttemptReload).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
    });

    it("uses default 500ms delay when staticAssets config is absent", () => {
      mockGetOptions.mockReturnValue({});
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(499);
      expect(mockAttemptReload).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
    });

    it("allows a new reload after the previous timer fires and resets state", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);

      // Trigger another failure after the first cycle completes
      handleStaticAssetFailure("https://example.com/assets/vendor-abc12345.js");
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).toHaveBeenCalledTimes(2);
    });

    it("does not call attemptReload when in fallback mode at entry", () => {
      mockIsInFallbackMode.mockReturnValue(true);
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).not.toHaveBeenCalled();
    });

    it("does not call attemptReload when fallback mode is set after timer is registered", () => {
      mockIsInFallbackMode.mockReturnValue(false);
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      // Fallback mode activates during the delay window
      mockIsInFallbackMode.mockReturnValue(true);
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).not.toHaveBeenCalled();
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
        expect(mockAttemptReload).not.toHaveBeenCalled();
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
    it("cancels a pending timer so attemptReload is never called", () => {
      handleStaticAssetFailure("https://example.com/assets/index-Bd0Ef7jk.js");
      resetStaticAssetRecovery();
      vi.advanceTimersByTime(500);
      expect(mockAttemptReload).not.toHaveBeenCalled();
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
      expect(mockAttemptReload).toHaveBeenCalledTimes(1);
    });
  });
});
