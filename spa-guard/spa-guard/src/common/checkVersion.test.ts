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

const simulateFocus = () => {
  globalThis.dispatchEvent(new Event("focus"));
};

const simulateBlur = () => {
  globalThis.dispatchEvent(new Event("blur"));
};

describe("common/checkVersion", () => {
  let mod: Awaited<ReturnType<typeof loadModule>>;
  let originalFetch: typeof globalThis.fetch;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockLocationReload: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    mockLocationReload = vi.fn();
    Object.defineProperty(globalThis.location, "reload", {
      configurable: true,
      value: mockLocationReload,
      writable: true,
    });

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

      it('fetches with cache: "no-cache" when explicitly configured', async () => {
        setWindowOptions({
          checkVersion: { cache: "no-cache", interval: 1000, mode: "html" },
          version: "1.0.0",
        });

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => 'window.__SPA_GUARD_OPTIONS__={"version":"1.0.0"}',
        });

        mod.startVersionCheck();

        await vi.advanceTimersByTimeAsync(1000);

        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            cache: "no-cache",
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

      it('fetches with cache: "no-cache" when explicitly configured', async () => {
        setWindowOptions({
          checkVersion: {
            cache: "no-cache",
            endpoint: "/api/version",
            interval: 1000,
            mode: "json",
          },
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
            cache: "no-cache",
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

    it("prevents in-flight fetch from triggering version change after stop", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      let resolveFetch: ((value: any) => void) | undefined;
      globalThis.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      );

      const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

      mod.startVersionCheck();

      // First interval tick - starts a fetch
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Stop while fetch is in-flight
      mod.stopVersionCheck();

      // Resolve the fetch with a new version
      resolveFetch!({
        json: async () => ({ version: "2.0.0" }),
        ok: true,
      });
      await vi.advanceTimersByTimeAsync(0);

      // Should NOT have dispatched version-change event or reloaded
      expect(dispatchEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "spa-guard:version-change" }),
      );
      expect(mockLocationReload).not.toHaveBeenCalled();
    });

    it("prevents in-flight fetch from triggering version change after stop then restart", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      let resolveFetch: ((value: any) => void) | undefined;
      globalThis.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      );

      const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

      mod.startVersionCheck();

      // First interval tick - starts a fetch
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Stop while fetch is in-flight, then immediately restart
      mod.stopVersionCheck();
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "3.0.0",
      });
      mod.startVersionCheck();

      // Resolve the OLD fetch with a different version
      resolveFetch!({
        json: async () => ({ version: "2.0.0" }),
        ok: true,
      });
      await vi.advanceTimersByTimeAsync(0);

      // The stale request should NOT trigger version change or reload
      expect(dispatchEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "spa-guard:version-change" }),
      );
      expect(mockLocationReload).not.toHaveBeenCalled();
    });

    it("does not let stale finally block clobber checkInProgress lock after stop then restart", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      // First fetch: stays pending so we can control resolution
      let resolveOldFetch: ((value: any) => void) | undefined;
      globalThis.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveOldFetch = resolve;
          }),
      );

      mod.startVersionCheck();

      // Tick - starts old fetch (epoch N)
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Stop then restart (epoch N+2)
      mod.stopVersionCheck();
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });
      mod.startVersionCheck();

      // New fetch: also stays pending
      let resolveNewFetch: ((value: any) => void) | undefined;
      globalThis.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveNewFetch = resolve;
          }),
      );

      // Tick - starts new fetch (epoch N+2)
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Resolve the OLD fetch - its finally must NOT clear checkInProgress
      resolveOldFetch!({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });
      await vi.advanceTimersByTimeAsync(0);

      // Next tick - should be skipped because new fetch is still in-flight
      await vi.advanceTimersByTimeAsync(1000);
      // fetch count should still be 1 (the new fetch), not 2
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Resolve the new fetch to clean up
      resolveNewFetch!({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });
      await vi.advanceTimersByTimeAsync(0);
    });

    it("allows new checks to proceed after stop clears checkInProgress from a hung request", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      // First fetch never resolves (simulating a hung request)
      globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      mod.startVersionCheck();

      // Tick - starts a fetch that hangs
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Stop (this should reset checkInProgress)
      mod.stopVersionCheck();

      // Restart with a new fetch that resolves
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });
      mod.startVersionCheck();

      // New check should not be blocked by the old hung request
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("unblocks checkInProgress after 30s fetch timeout so subsequent checks can run", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      // First fetch hangs but responds to abort signal
      globalThis.fetch = vi.fn().mockImplementation(
        (_url: string, { signal }: RequestInit = {}) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );

      mod.startVersionCheck();

      // First interval tick - starts a hung fetch (checkInProgress becomes true)
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Replace fetch with a resolving one for calls that come after the timeout
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });

      // Advance past the 30s abort timeout - AbortController fires → AbortError →
      // checkInProgress is cleared in the finally block
      await vi.advanceTimersByTimeAsync(30_000);

      // One more interval tick after the lock is cleared - should call the new fetch
      await vi.advanceTimersByTimeAsync(1000);

      // After the timeout clears the lock, at least one new check should have run
      expect(globalThis.fetch).toHaveBeenCalled();
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

    it("parses version from HTML with typical serialized options format (legacy)", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          'window.__SPA_GUARD_OPTIONS__={"checkVersion":{"interval":300000,"mode":"html"},"version":"2.5.0"};/* script */',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("2.5.0");
    });

    it("parses version from new __SPA_GUARD_VERSION__ format", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          'window.__SPA_GUARD_VERSION__="3.0.0";window.__SPA_GUARD_OPTIONS__={"version":"3.0.0"};/* script */',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("3.0.0");
    });

    it("prefers __SPA_GUARD_VERSION__ over __SPA_GUARD_OPTIONS__ when both are present", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          'window.__SPA_GUARD_VERSION__="2.0.0";window.__SPA_GUARD_OPTIONS__={"version":"1.0.0"};/* script */',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("2.0.0");
    });

    it("falls back to __SPA_GUARD_OPTIONS__ when __SPA_GUARD_VERSION__ is absent (old deployment)", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          'window.__SPA_GUARD_OPTIONS__={"version":"1.5.0","reloadDelays":[1000]};/* script */',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("1.5.0");
    });

    it("handles HTML with newlines from formatters (e.g. Prettier)", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          '<html>\n<head>\n<script>\nwindow.__SPA_GUARD_VERSION__="4.0.0";\nwindow.__SPA_GUARD_OPTIONS__={\n"version":"4.0.0"\n};\n</script>\n</head>\n</html>',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("4.0.0");
    });

    it("handles old format HTML with newlines from formatters", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          '<html>\n<head>\n<script>\nwindow.__SPA_GUARD_OPTIONS__={\n"version":"4.0.0"\n};\n</script>\n</head>\n</html>',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("4.0.0");
    });

    it("works with unquoted keys (JSDOM behavior)", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          'window.__SPA_GUARD_OPTIONS__={version:"5.0.0",reloadDelays:[1000]};/* script */',
      });

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBe("5.0.0");
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

  describe("initial tab state handling", () => {
    afterEach(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
    });

    it("does not start polling when tab is initially hidden", async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });

      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });

      mod.startVersionCheck();

      expect(mockLogger.versionCheckPaused).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("does not start polling when window is initially unfocused", async () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(false);

      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });

      mod.startVersionCheck();

      expect(mockLogger.versionCheckPaused).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("starts polling when focus event arrives after initially hidden start", async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });

      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 5000, mode: "json" },
        version: "1.0.0",
      });
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });

      mod.startVersionCheck();

      // Simulate tab becoming visible and focused after 6 seconds
      await vi.advanceTimersByTimeAsync(6000);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      simulateVisibilityChange("visible");

      // Interval elapsed (6000 >= 5000), so immediate check
      expect(mockLogger.versionCheckResumedImmediate).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(0);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("focus/blur-based pausing", () => {
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

    it("pauses polling when window loses focus", async () => {
      startJsonCheck(1000);
      simulateBlur();

      expect(mockLogger.versionCheckPaused).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("resumes polling when window gains focus", async () => {
      startJsonCheck(5000);
      simulateBlur();
      await vi.advanceTimersByTimeAsync(6000);
      simulateFocus();

      expect(mockLogger.versionCheckResumedImmediate).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(0);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("resumes with delayed check when focus returns before interval elapses", async () => {
      startJsonCheck(10_000);
      await vi.advanceTimersByTimeAsync(3000);
      simulateBlur();
      await vi.advanceTimersByTimeAsync(2000);
      simulateFocus();

      expect(mockLogger.versionCheckResumed).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(5000);

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("cleans up focus and blur listeners on stopVersionCheck", () => {
      const removeListenerSpy = vi.spyOn(globalThis, "removeEventListener");

      setWindowOptions({ checkVersion: { interval: 1000 }, version: "1.0.0" });
      mod.startVersionCheck();
      mod.stopVersionCheck();

      expect(removeListenerSpy).toHaveBeenCalledWith("focus", expect.any(Function));
      expect(removeListenerSpy).toHaveBeenCalledWith("blur", expect.any(Function));
    });
  });

  describe("deduplication of concurrent checks", () => {
    it("skips concurrent version checks when one is already in-flight", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      // Create a fetch that stays pending (never resolves immediately)
      let resolveFetch: ((value: any) => void) | undefined;
      globalThis.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      );

      mod.startVersionCheck();

      // First interval tick - starts a fetch
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Second interval tick - check should be skipped because first is in-flight
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Resolve the first fetch
      resolveFetch!({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });
      await vi.advanceTimersByTimeAsync(0);

      // Third tick - now a new check can proceed
      await vi.advanceTimersByTimeAsync(1000);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("does not restart timers when both visibilitychange and focus fire together", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 5000, mode: "json" },
        version: "1.0.0",
      });
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "1.0.0" }),
        ok: true,
      });

      mod.startVersionCheck();
      simulateBlur();
      await vi.advanceTimersByTimeAsync(6000);

      // Both events fire close together (common browser behavior)
      simulateVisibilityChange("visible");
      simulateFocus();

      // Only one resumedImmediate log - the second call is a no-op because timers are already running
      expect(mockLogger.versionCheckResumedImmediate).toHaveBeenCalledTimes(1);

      // Only one fetch from the single resume
      await vi.advanceTimersByTimeAsync(0);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("onUpdate auto-reload behavior", () => {
    it("calls location.reload() by default when version changes", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "2.0.0" }),
        ok: true,
      });

      mod.startVersionCheck();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockLocationReload).toHaveBeenCalledTimes(1);
    });

    it('calls location.reload() when onUpdate is explicitly "reload"', async () => {
      setWindowOptions({
        checkVersion: {
          endpoint: "/api/version",
          interval: 1000,
          mode: "json",
          onUpdate: "reload",
        },
        version: "1.0.0",
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "2.0.0" }),
        ok: true,
      });

      mod.startVersionCheck();
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockLocationReload).toHaveBeenCalledTimes(1);
    });

    it('does not call location.reload() when onUpdate is "event"', async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json", onUpdate: "event" },
        version: "1.0.0",
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ version: "2.0.0" }),
        ok: true,
      });

      const dispatchEvent = vi.spyOn(globalThis, "dispatchEvent");

      mod.startVersionCheck();
      await vi.advanceTimersByTimeAsync(1000);

      expect(dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { latestVersion: "2.0.0", oldVersion: "1.0.0" },
          type: "spa-guard:version-change",
        }),
      );
      expect(mockLocationReload).not.toHaveBeenCalled();
    });

    it("does not call location.reload() when version is unchanged", async () => {
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

      expect(mockLocationReload).not.toHaveBeenCalled();
    });
  });
});
