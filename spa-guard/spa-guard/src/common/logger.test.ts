import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SPAGuardEvent } from "./events/types";

import { createLogger } from "./logger";

describe("common/logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createLogger()", () => {
    it("returns an object with all expected methods", () => {
      const logger = createLogger();

      expect(typeof logger.logEvent).toBe("function");
      expect(typeof logger.capturedError).toBe("function");
      expect(typeof logger.retryLimitExceeded).toBe("function");
      expect(typeof logger.clearingRetryState).toBe("function");
      expect(typeof logger.fallbackAlreadyShown).toBe("function");
      expect(typeof logger.fallbackInjectFailed).toBe("function");
      expect(typeof logger.fallbackTargetNotFound).toBe("function");
      expect(typeof logger.noFallbackConfigured).toBe("function");
      expect(typeof logger.updatedRetryAttempt).toBe("function");
      expect(typeof logger.beaconSendFailed).toBe("function");
      expect(typeof logger.noBeaconEndpoint).toBe("function");
      expect(typeof logger.log).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });
  });

  describe("logEvent() - event auto-logging", () => {
    it("logs chunk-error at error level with error object", () => {
      const logger = createLogger();
      const err = new Error("chunk fail");
      const event: SPAGuardEvent = { error: err, isRetrying: true, name: "chunk-error" };

      logger.logEvent(event);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] chunk-error: isRetrying=true", err);
    });

    it("logs chunk-error with isRetrying=false", () => {
      const logger = createLogger();
      const err = new Error("chunk fail");
      const event: SPAGuardEvent = { error: err, isRetrying: false, name: "chunk-error" };

      logger.logEvent(event);

      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] chunk-error: isRetrying=false", err);
    });

    it("logs retry-attempt at warn level", () => {
      const logger = createLogger();
      const event: SPAGuardEvent = {
        attempt: 2,
        delay: 1000,
        name: "retry-attempt",
        retryId: "abc-123",
      };

      logger.logEvent(event);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "[spa-guard] retry-attempt: attempt 2 in 1000ms (retryId: abc-123)",
      );
    });

    it("logs retry-reset at log level", () => {
      const logger = createLogger();
      const event: SPAGuardEvent = {
        name: "retry-reset",
        previousAttempt: 2,
        previousRetryId: "old-id",
        timeSinceReload: 5000,
      };

      logger.logEvent(event);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] retry-reset: 5000ms since last reload (retryId: old-id)",
      );
    });

    it("logs retry-exhausted at error level", () => {
      const logger = createLogger();
      const event: SPAGuardEvent = {
        finalAttempt: 3,
        name: "retry-exhausted",
        retryId: "xyz-789",
      };

      logger.logEvent(event);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "[spa-guard] retry-exhausted: finalAttempt=3 (retryId: xyz-789)",
      );
    });

    it("logs fallback-ui-shown at warn level", () => {
      const logger = createLogger();

      logger.logEvent({ name: "fallback-ui-shown" });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith("[spa-guard] fallback-ui-shown");
    });

    it("logs lazy-retry-start at log level", () => {
      const logger = createLogger();
      const event: SPAGuardEvent = {
        name: "lazy-retry-start",
        totalAttempts: 3,
      };

      logger.logEvent(event);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith("[spa-guard] lazy-retry-start: totalAttempts=3");
    });

    it("logs lazy-retry-attempt at warn level with error object", () => {
      const logger = createLogger();
      const err = new Error("chunk load failed");
      const event: SPAGuardEvent = {
        attempt: 1,
        delay: 200,
        error: err,
        name: "lazy-retry-attempt",
        totalAttempts: 3,
      };

      logger.logEvent(event);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "[spa-guard] lazy-retry-attempt: attempt 1/3, delay 200ms",
        err,
      );
    });

    it("logs lazy-retry-attempt without error when error is undefined", () => {
      const logger = createLogger();
      const event: SPAGuardEvent = {
        attempt: 1,
        delay: 200,
        name: "lazy-retry-attempt",
        totalAttempts: 3,
      };

      logger.logEvent(event);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "[spa-guard] lazy-retry-attempt: attempt 1/3, delay 200ms",
        undefined,
      );
    });

    it("logs lazy-retry-exhausted at error level with error object", () => {
      const logger = createLogger();
      const err = new Error("chunk exhausted");
      const event: SPAGuardEvent = {
        error: err,
        name: "lazy-retry-exhausted",
        totalAttempts: 3,
        willReload: true,
      };

      logger.logEvent(event);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "[spa-guard] lazy-retry-exhausted: 3 attempts, willReload=true",
        err,
      );
    });

    it("logs lazy-retry-success at log level without totalTime", () => {
      const logger = createLogger();
      const event: SPAGuardEvent = {
        attempt: 2,
        name: "lazy-retry-success",
      };

      logger.logEvent(event);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith("[spa-guard] lazy-retry-success: succeeded on attempt 2");
    });

    it("logs lazy-retry-success at log level with totalTime", () => {
      const logger = createLogger();
      const event: SPAGuardEvent = {
        attempt: 2,
        name: "lazy-retry-success",
        totalTime: 1500,
      };

      logger.logEvent(event);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] lazy-retry-success: succeeded on attempt 2, totalTime=1500ms",
      );
    });
  });

  describe("specific methods - listen/internal.ts", () => {
    it("capturedError logs at error level with type prefix", () => {
      const logger = createLogger();
      const event = { message: "test error" };

      logger.capturedError("error", event);

      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] error:capture:", event);
    });

    it("capturedError handles multiple args", () => {
      const logger = createLogger();

      logger.capturedError("csp", "blocked-uri", "violated-directive");

      expect(errorSpy).toHaveBeenCalledWith(
        "[spa-guard] csp:capture:",
        "blocked-uri",
        "violated-directive",
      );
    });

    it("retryLimitExceeded logs at log level", () => {
      const logger = createLogger();

      logger.retryLimitExceeded(3, 3);

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Retry limit exceeded (3/3), marking as fallback shown",
      );
    });
  });

  describe("specific methods - reload.ts", () => {
    it("fallbackAlreadyShown logs at error level with error", () => {
      const logger = createLogger();
      const err = new Error("test");

      logger.fallbackAlreadyShown(err);

      expect(errorSpy).toHaveBeenCalledWith(
        "[spa-guard] Fallback UI was already shown. Not retrying to prevent infinite loop.",
        err,
      );
    });

    it("noFallbackConfigured logs at error level", () => {
      const logger = createLogger();

      logger.noFallbackConfigured();

      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] No fallback UI configured");
    });

    it("fallbackTargetNotFound logs at error level with selector", () => {
      const logger = createLogger();

      logger.fallbackTargetNotFound("#app");

      expect(errorSpy).toHaveBeenCalledWith(
        "[spa-guard] Target element not found for selector: #app",
      );
    });

    it("clearingRetryState logs at log level", () => {
      const logger = createLogger();

      logger.clearingRetryState();

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Clearing retry state from URL to allow clean reload attempt",
      );
    });

    it("updatedRetryAttempt logs at log level with attempt number", () => {
      const logger = createLogger();

      logger.updatedRetryAttempt(3);

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Updated retry attempt to 3 in URL for fallback UI",
      );
    });

    it("fallbackInjectFailed logs at error level with error", () => {
      const logger = createLogger();
      const err = new Error("inject failed");

      logger.fallbackInjectFailed(err);

      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] Failed to inject fallback UI", err);
    });

    it("reloadAlreadyScheduled logs at log level with error", () => {
      const logger = createLogger();
      const err = new Error("chunk error");

      logger.reloadAlreadyScheduled(err);

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Reload already scheduled, ignoring duplicate chunk error:",
        err,
      );
    });

    it("retryCycleStarting logs at log level with retryId and attempt", () => {
      const logger = createLogger();

      logger.retryCycleStarting("abc-123", 2);

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Retry cycle starting: retryId=abc-123, fromAttempt=2",
      );
    });

    it("retrySchedulingReload logs at log level with details", () => {
      const logger = createLogger();

      logger.retrySchedulingReload("abc-123", 2, 2000);

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Scheduling reload: retryId=abc-123, attempt=2, delay=2000ms",
      );
    });
  });

  describe("specific methods - sendBeacon.ts", () => {
    it("noBeaconEndpoint logs at warn level", () => {
      const logger = createLogger();

      logger.noBeaconEndpoint();

      expect(warnSpy).toHaveBeenCalledWith("[spa-guard] Report endpoint is not configured");
    });

    it("beaconSendFailed logs at error level with error", () => {
      const logger = createLogger();
      const err = new Error("send failed");

      logger.beaconSendFailed(err);

      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] Failed to send beacon:", err);
    });
  });

  describe("specific methods - checkVersion.ts", () => {
    it("versionCheckRequiresEndpoint logs at warn level", () => {
      const logger = createLogger();

      logger.versionCheckRequiresEndpoint();

      expect(warnSpy).toHaveBeenCalledWith("[spa-guard] JSON version check mode requires endpoint");
    });

    it("versionCheckHttpError logs at warn level with status", () => {
      const logger = createLogger();

      logger.versionCheckHttpError(404);

      expect(warnSpy).toHaveBeenCalledWith("[spa-guard] Version check HTTP error: 404");
    });

    it("versionCheckParseError logs at warn level", () => {
      const logger = createLogger();

      logger.versionCheckParseError();

      expect(warnSpy).toHaveBeenCalledWith("[spa-guard] Failed to parse version from HTML");
    });

    it("versionChangeDetected logs at warn level", () => {
      const logger = createLogger();

      logger.versionChangeDetected("1.0.0", "2.0.0");

      expect(warnSpy).toHaveBeenCalledWith(
        "[spa-guard] New version available (1.0.0 → 2.0.0). Please refresh to get the latest version.",
      );
    });

    it("versionCheckFailed logs at error level with error", () => {
      const logger = createLogger();
      const err = new Error("network error");

      logger.versionCheckFailed(err);

      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] Version check failed", err);
    });

    it("versionCheckDisabled logs at warn level", () => {
      const logger = createLogger();

      logger.versionCheckDisabled();

      expect(warnSpy).toHaveBeenCalledWith(
        "[spa-guard] Version checking disabled: no version configured",
      );
    });

    it("versionCheckAlreadyRunning logs at warn level", () => {
      const logger = createLogger();

      logger.versionCheckAlreadyRunning();

      expect(warnSpy).toHaveBeenCalledWith("[spa-guard] Version check already running");
    });

    it("versionCheckStarted logs at log level with details", () => {
      const logger = createLogger();

      logger.versionCheckStarted("html", 300_000, "1.0.0");

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Starting version check (mode: html, interval: 300000ms, current: 1.0.0)",
      );
    });

    it("versionCheckStopped logs at log level", () => {
      const logger = createLogger();

      logger.versionCheckStopped();

      expect(logSpy).toHaveBeenCalledWith("[spa-guard] Version check stopped");
    });

    it("versionCheckPaused logs at log level", () => {
      const logger = createLogger();

      logger.versionCheckPaused();

      expect(logSpy).toHaveBeenCalledWith("[spa-guard] Version check paused (tab hidden)");
    });

    it("versionCheckResumed logs at log level", () => {
      const logger = createLogger();

      logger.versionCheckResumed();

      expect(logSpy).toHaveBeenCalledWith("[spa-guard] Version check resumed (tab visible)");
    });

    it("versionCheckResumedImmediate logs at log level", () => {
      const logger = createLogger();

      logger.versionCheckResumedImmediate();

      expect(logSpy).toHaveBeenCalledWith(
        "[spa-guard] Version check resumed with immediate check (tab visible, interval elapsed)",
      );
    });
  });

  describe("generic methods", () => {
    it("log prefixes message with [spa-guard]", () => {
      const logger = createLogger();

      logger.log("test message");

      expect(logSpy).toHaveBeenCalledWith("[spa-guard] test message");
    });

    it("log passes additional args", () => {
      const logger = createLogger();

      logger.log("test", { data: 1 });

      expect(logSpy).toHaveBeenCalledWith("[spa-guard] test", { data: 1 });
    });

    it("warn prefixes message with [spa-guard]", () => {
      const logger = createLogger();

      logger.warn("warning message");

      expect(warnSpy).toHaveBeenCalledWith("[spa-guard] warning message");
    });

    it("error prefixes message with [spa-guard]", () => {
      const logger = createLogger();

      logger.error("error message");

      expect(errorSpy).toHaveBeenCalledWith("[spa-guard] error message");
    });
  });
});
