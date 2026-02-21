import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Options } from "./options";

import { optionsWindowKey } from "./constants";

const setWindowOptions = (opts: Options) => {
  (globalThis.window as any)[optionsWindowKey] = opts;
};

const clearWindowOptions = () => {
  delete (globalThis.window as any)[optionsWindowKey];
};

const loadModule = async () => {
  const m = await import("./checkVersion");
  return m;
};

describe("common/checkVersion", () => {
  let mod: Awaited<ReturnType<typeof loadModule>>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    vi.useFakeTimers();
    vi.resetModules();
    clearWindowOptions();

    mod = await loadModule();
  });

  afterEach(() => {
    mod._resetForTesting();
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearWindowOptions();
  });

  describe("startVersionCheck", () => {
    it("warns and returns when no version is configured", () => {
      setWindowOptions({});
      const consoleWarn = vi.spyOn(console, "warn");

      mod.startVersionCheck();

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Version checking disabled"),
      );
    });

    it("warns when called twice (duplicate start)", () => {
      setWindowOptions({ checkVersion: { interval: 5000 }, version: "1.0.0" });
      const consoleWarn = vi.spyOn(console, "warn");

      mod.startVersionCheck();
      mod.startVersionCheck();

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Version check already running"),
      );
    });

    it("logs the start message with mode, interval, and version", () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 30_000, mode: "json" },
        version: "1.0.0",
      });
      const consoleLog = vi.spyOn(console, "log");

      mod.startVersionCheck();

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting version check (mode: json, interval: 30000ms, current: 1.0.0)",
        ),
      );
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

  describe("version change detection - HTML mode", () => {
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

  describe("version change detection - JSON mode", () => {
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

  describe("fetch error handling", () => {
    it("logs error and continues when fetch fails", async () => {
      setWindowOptions({
        checkVersion: { endpoint: "/api/version", interval: 1000, mode: "json" },
        version: "1.0.0",
      });

      const networkError = new Error("Network error");
      globalThis.fetch = vi.fn().mockRejectedValue(networkError);

      const consoleError = vi.spyOn(console, "error");

      mod.startVersionCheck();

      await vi.advanceTimersByTimeAsync(1000);

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("Version check failed"),
        networkError,
      );
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

    it("logs when stopped", () => {
      setWindowOptions({
        checkVersion: { interval: 1000 },
        version: "1.0.0",
      });

      const consoleLog = vi.spyOn(console, "log");

      mod.startVersionCheck();
      mod.stopVersionCheck();

      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("Version check stopped"));
    });

    it("does nothing when called without a running check", () => {
      // Should not throw
      expect(() => mod.stopVersionCheck()).not.toThrow();
    });
  });

  describe("fetchRemoteVersion", () => {
    it("returns null and warns when JSON mode has no endpoint", async () => {
      setWindowOptions({});
      const consoleWarn = vi.spyOn(console, "warn");

      const result = await mod.fetchRemoteVersion("json");

      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("JSON version check mode requires endpoint"),
      );
    });

    it("returns null and warns when HTML does not contain version", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "<html><head></head><body>Hello</body></html>",
      });
      const consoleWarn = vi.spyOn(console, "warn");

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse version from HTML"),
      );
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

    it("returns null and warns on non-OK HTTP response in JSON mode", async () => {
      setWindowOptions({ checkVersion: { endpoint: "/api/version" } });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      const consoleWarn = vi.spyOn(console, "warn");

      const result = await mod.fetchRemoteVersion("json");

      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Version check HTTP error: 500"),
      );
    });

    it("returns null and warns on non-OK HTTP response in HTML mode", async () => {
      setWindowOptions({});
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      const consoleWarn = vi.spyOn(console, "warn");

      const result = await mod.fetchRemoteVersion("html");

      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Version check HTTP error: 404"),
      );
    });
  });
});
