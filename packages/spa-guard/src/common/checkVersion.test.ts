import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "./logger";
import type { Options } from "./options";

import { loggerWindowKey, optionsWindowKey } from "./constants";

const setWindowOptions = (opts: Options) => {
  (globalThis.window as any)[optionsWindowKey] = opts;
};

const clearWindowOptions = () => {
  delete (globalThis.window as any)[optionsWindowKey];
};

const createMockLogger = (): Logger => ({
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
  versionChanged: vi.fn(),
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

const setWindowLogger = (logger: Logger) => {
  (globalThis.window as any)[loggerWindowKey] = logger;
};

const clearWindowLogger = () => {
  delete (globalThis.window as any)[loggerWindowKey];
};

const loadModule = async () => {
  const m = await import("./checkVersion");
  return m;
};

const simulateVisibilityChange = (state: "hidden" | "visible") => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("common/checkVersion", () => {
  let mod: Awaited<ReturnType<typeof loadModule>>;
  let originalFetch: typeof globalThis.fetch;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    vi.useFakeTimers();
    vi.resetModules();
    clearWindowOptions();

    mockLogger = createMockLogger();
    setWindowLogger(mockLogger);

    mod = await loadModule();
  });

  afterEach(() => {
    mod._resetForTesting();
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearWindowOptions();
    clearWindowLogger();
  });

  describe("startVersionCheck", () => {
    it("calls versionCheckDisabled when no version is configured", () => {
      setWindowOptions({});

      mod.startVersionCheck();

      expect(mockLogger.versionCheckDisabled).toHaveBeenCalledTimes(1);
    });

    it("calls versionCheckAlreadyRunning when called twice (duplicate start)", () => {
      setWindowOptions({ checkVersion: { interval: 5000 }, version: "1.0.0" });

      mod.startVersionCheck();
      mod.startVersionCheck();

      expect(mockLogger.versionCheckAlreadyRunning).toHaveBeenCalledTimes(1);
    });

    it("calls versionCheckStarted with mode, interval, and version", () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 30_000, mode: "json" },
        version: "1.0.0",
      });

      mod.startVersionCheck();

      expect(mockLogger.versionCheckStarted).toHaveBeenCalledWith("json", 30_000, "1.0.0");
    });

    it("is a no-op in SSR (no window)", async () => {
      const originalWindow = globalThis.window;
      try {
        // @ts-expect-error - simulate SSR
        delete globalThis.window;
        vi.resetModules();

        const ssrMod = await loadModule();

        // Should not throw
        expect(() => ssrMod.startVersionCheck()).not.toThrow();
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });

  describe("version change detection", () => {
    describe("HTML mode", () => {
      it("dispatches event when version changes", async () => {
        setWindowOptions({ checkVersion: { interval: 1000, mode: "html" }, version: "1.0.0" });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => 'window.__SPA_GUARD_OPTIONS__={"version":"1.0.1","other":"data"}',
        });

        const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { latestVersion: "1.0.1", oldVersion: "1.0.0" },
            type: "spa-guard:version-change",
          }),
        );
      });

      it("does not dispatch event when version is unchanged", async () => {
        setWindowOptions({ checkVersion: { interval: 1000, mode: "html" }, version: "1.0.0" });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => 'window.__SPA_GUARD_OPTIONS__={"version":"1.0.0"}',
        });

        const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(dispatchEvent).not.toHaveBeenCalled();
      });

      it("fetches with cache: no-store and Accept: text/html", async () => {
        setWindowOptions({ checkVersion: { interval: 1000, mode: "html" }, version: "1.0.0" });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => 'window.__SPA_GUARD_OPTIONS__={"version":"1.0.0"}',
        });

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            cache: "no-store",
            headers: { Accept: "text/html" },
          }),
        );
      });
    });

    describe("JSON mode", () => {
      it("dispatches event when version changes", async () => {
        setWindowOptions({
          checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
          version: "1.0.0",
        });

        globalThis.fetch = vi.fn().mockResolvedValue({
          json: async () => ({ version: "1.0.1" }),
          ok: true,
        });

        const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { latestVersion: "1.0.1", oldVersion: "1.0.0" },
            type: "spa-guard:version-change",
          }),
        );
      });

      it("does not dispatch event when version is unchanged", async () => {
        setWindowOptions({
          checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
          version: "1.0.0",
        });

        globalThis.fetch = vi.fn().mockResolvedValue({
          json: async () => ({ version: "1.0.0" }),
          ok: true,
        });

        const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(dispatchEvent).not.toHaveBeenCalled();
      });

      it("fetches with cache: no-store and Accept: application/json", async () => {
        setWindowOptions({
          checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
          version: "1.0.0",
        });

        globalThis.fetch = vi.fn().mockResolvedValue({
          json: async () => ({ version: "1.0.0" }),
          ok: true,
        });

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(globalThis.fetch).toHaveBeenCalledWith(
          "/api/version",
          expect.objectContaining({
            cache: "no-store",
            headers: { Accept: "application/json" },
          }),
        );
      });
    });

    describe("error handling", () => {
      it("calls versionCheckFailed when fetch fails", async () => {
        setWindowOptions({
          checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
          version: "1.0.0",
        });

        const networkError = new Error("Network error");
        globalThis.fetch = vi.fn().mockRejectedValue(networkError);

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(mockLogger.versionCheckFailed).toHaveBeenCalledWith(networkError);
      });

      it("continues checking after a fetch error", async () => {
        setWindowOptions({
          checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
          version: "1.0.0",
        });

        globalThis.fetch = vi
          .fn()
          .mockRejectedValueOnce(new Error("Network error"))
          .mockResolvedValueOnce({
            json: async () => ({ version: "1.0.1" }),
            ok: true,
          });

        const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

        mod.startVersionCheck();

        // First tick: error
        await vi.advanceTimersByTimeAsync(1000);
        expect(dispatchEvent).not.toHaveBeenCalled();

        // Second tick: success with updated version
        await vi.advanceTimersByTimeAsync(1000);
        expect(dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "spa-guard:version-change",
          }),
        );
      });
    });

    describe("Logger method calls", () => {
      it("calls versionChanged when a new version is detected", async () => {
        setWindowOptions({ checkVersion: { interval: 1000, mode: "html" }, version: "1.0.0" });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => 'window.__SPA_GUARD_OPTIONS__={"version":"1.0.1"}',
        });

        mod.startVersionCheck();
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockLogger.versionChanged).toHaveBeenCalledWith("1.0.0", "1.0.1");
      });

      it("calls versionChangeDetected when a new version is detected", async () => {
        setWindowOptions({ checkVersion: { interval: 1000, mode: "html" }, version: "1.0.0" });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => 'window.__SPA_GUARD_OPTIONS__={"version":"1.0.1"}',
        });

        mod.startVersionCheck();
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockLogger.versionChangeDetected).toHaveBeenCalledWith("1.0.0", "1.0.1");
      });

      it("does not call Logger methods when no logger is set", () => {
        clearWindowLogger();
        setWindowOptions({});

        mod.startVersionCheck();

        expect(mockLogger.versionCheckDisabled).not.toHaveBeenCalled();
      });
    });
  });

  describe("stopVersionCheck", () => {
    it("clears the interval so no more fetches occur", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.1" }),
        ok: true,
      });

      mod.startVersionCheck();
      mod.stopVersionCheck();

      await vi.advanceTimersByTimeAsync(5000);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("calls versionCheckStopped when stopped", () => {
      setWindowOptions({
        checkVersion: { interval: 1000 },
        version: "1.0.0",
      });

      mod.startVersionCheck();
      mod.stopVersionCheck();

      expect(mockLogger.versionCheckStopped).toHaveBeenCalledTimes(1);
    });

    it("does nothing when called without a running check", () => {
      // Should not throw
      expect(() => mod.stopVersionCheck()).not.toThrow();
    });
  });

  describe("fetchRemoteVersion", () => {
    it("returns null and calls versionCheckRequiresEndpoint when JSON mode has no endpoint", async () => {
      setWindowOptions({});

      const result = await mod.fetchRemoteVersion("json");

      expect(result).toBeNull();
      expect(mockLogger.versionCheckRequiresEndpoint).toHaveBeenCalledTimes(1);
    });

    it("returns null and calls versionCheckParseError when HTML does not contain version", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "<html><head></head><body>Hello</body></html>",
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBeNull();
      expect(mockLogger.versionCheckParseError).toHaveBeenCalledTimes(1);
    });

    it("parses version from HTML with typical serialized options format", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          'window.__SPA_GUARD_OPTIONS__={"checkVersion":{"interval":60000,"mode":"html"},"version":"2.5.0"};/* script */',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("2.5.0");
    });

    it("returns version from JSON endpoint response", async () => {
      setWindowOptions({ checkVersion: { endpoint: "/api/version" } });
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ buildTime: "2025-01-01", version: "3.0.0" }),
        ok: true,
      });

      const result = await mod.fetchRemoteVersion("json");

      expect(result).toBe("3.0.0");
    });

    it("returns null when JSON response has no version field", async () => {
      setWindowOptions({ checkVersion: { endpoint: "/api/version" } });
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ buildTime: "2025-01-01" }),
        ok: true,
      });

      const result = await mod.fetchRemoteVersion("json");

      expect(result).toBeNull();
    });

    it("returns null and calls versionCheckHttpError on non-OK HTTP response in JSON mode", async () => {
      setWindowOptions({ checkVersion: { endpoint: "/api/version" } });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await mod.fetchRemoteVersion("json");

      expect(result).toBeNull();
      expect(mockLogger.versionCheckHttpError).toHaveBeenCalledWith(500);
    });

    it("returns null and calls versionCheckHttpError on non-OK HTTP response in HTML mode", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBeNull();
      expect(mockLogger.versionCheckHttpError).toHaveBeenCalledWith(404);
    });
  });

  describe("visibility-based pausing", () => {
    const startJsonCheck = (interval: number) => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval, mode: "json" },
        version: "1.0.0",
      });
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });
      mod.startVersionCheck();
    };

    afterEach(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
    });

    it("pauses polling when tab becomes hidden", async () => {
      startJsonCheck(1000);
      simulateVisibilityChange("hidden");

      expect(mockLogger.versionCheckPaused).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("resumes with delayed check when tab becomes visible before interval elapses", async () => {
      startJsonCheck(10_000);
      await vi.advanceTimersByTimeAsync(3000);
      simulateVisibilityChange("hidden");
      await vi.advanceTimersByTimeAsync(2000);
      simulateVisibilityChange("visible");

      expect(mockLogger.versionCheckResumed).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(5000);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("resumes with immediate check when tab becomes visible after interval elapses", async () => {
      startJsonCheck(5000);
      simulateVisibilityChange("hidden");
      await vi.advanceTimersByTimeAsync(10_000);
      simulateVisibilityChange("visible");

      expect(mockLogger.versionCheckResumedImmediate).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(0);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("resumes regular polling after visibility restore", async () => {
      startJsonCheck(1000);
      simulateVisibilityChange("hidden");
      await vi.advanceTimersByTimeAsync(2000);
      simulateVisibilityChange("visible");

      await vi.advanceTimersByTimeAsync(0);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("cleans up visibility listener on stopVersionCheck", () => {
      setWindowOptions({ checkVersion: { interval: 1000 }, version: "1.0.0" });
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      mod.startVersionCheck();
      mod.stopVersionCheck();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    });

    it("handles multiple hide/show cycles correctly", async () => {
      startJsonCheck(5000);

      // Cycle 1: hide longer than interval -> immediate check on resume
      simulateVisibilityChange("hidden");
      await vi.advanceTimersByTimeAsync(6000);
      simulateVisibilityChange("visible");

      // Cycle 2: brief hide -> delayed check on resume
      simulateVisibilityChange("hidden");
      await vi.advanceTimersByTimeAsync(1000);
      simulateVisibilityChange("visible");

      await vi.advanceTimersByTimeAsync(4000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("does not fetch during hidden state even if timeout was pending", async () => {
      startJsonCheck(10_000);

      // Create a pending timeout by hide->show->hide
      simulateVisibilityChange("hidden");
      await vi.advanceTimersByTimeAsync(2000);
      simulateVisibilityChange("visible");
      simulateVisibilityChange("hidden");

      await vi.advanceTimersByTimeAsync(20_000);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });
});
