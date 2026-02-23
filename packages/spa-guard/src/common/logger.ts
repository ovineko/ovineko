import type { SPAGuardEvent } from "./events/types";

export interface Logger {
  beaconSendFailed(error: unknown): void;
  capturedError(type: string, ...args: unknown[]): void;
  clearingRetryState(): void;
  error(msg: string, ...args: unknown[]): void;
  fallbackAlreadyShown(error: unknown): void;
  fallbackInjectFailed(error: unknown): void;
  fallbackTargetNotFound(selector: string): void;
  log(msg: string, ...args: unknown[]): void;
  logEvent(event: SPAGuardEvent): void;
  noBeaconEndpoint(): void;
  noFallbackConfigured(): void;
  retryLimitExceeded(attempt: number, max: number): void;
  updatedRetryAttempt(attempt: number): void;
  versionChanged(oldVersion: null | string, latestVersion: string): void;
  versionChangeDetected(oldVersion: null | string, latestVersion: string): void;
  versionCheckAlreadyRunning(): void;
  versionCheckDisabled(): void;
  versionCheckFailed(error: unknown): void;
  versionCheckHttpError(status: number): void;
  versionCheckParseError(): void;
  versionCheckRequiresEndpoint(): void;
  versionCheckStarted(mode: string, interval: number, version: string): void;
  versionCheckStopped(): void;
  warn(msg: string, ...args: unknown[]): void;
}

const PREFIX = "[spa-guard]";

const eventLogConfig: Record<SPAGuardEvent["name"], "error" | "log" | "warn"> = {
  "chunk-error": "error",
  "fallback-ui-shown": "warn",
  "lazy-retry-attempt": "warn",
  "lazy-retry-exhausted": "error",
  "lazy-retry-success": "log",
  "retry-attempt": "warn",
  "retry-exhausted": "error",
  "retry-reset": "log",
};

const formatEvent = (event: SPAGuardEvent): string => {
  switch (event.name) {
    case "chunk-error": {
      return `${PREFIX} chunk-error: isRetrying=${event.isRetrying}`;
    }
    case "fallback-ui-shown": {
      return `${PREFIX} fallback-ui-shown`;
    }
    case "lazy-retry-attempt": {
      return `${PREFIX} lazy-retry-attempt: attempt ${event.attempt}/${event.totalAttempts}, delay ${event.delay}ms`;
    }
    case "lazy-retry-exhausted": {
      return `${PREFIX} lazy-retry-exhausted: ${event.totalAttempts} attempts, willReload=${event.willReload}`;
    }
    case "lazy-retry-success": {
      return `${PREFIX} lazy-retry-success: succeeded on attempt ${event.attempt}`;
    }
    case "retry-attempt": {
      return `${PREFIX} retry-attempt: attempt ${event.attempt} in ${event.delay}ms (retryId: ${event.retryId})`;
    }
    case "retry-exhausted": {
      return `${PREFIX} retry-exhausted: finalAttempt=${event.finalAttempt} (retryId: ${event.retryId})`;
    }
    case "retry-reset": {
      return `${PREFIX} retry-reset: ${event.timeSinceReload}ms since last reload (retryId: ${event.previousRetryId})`;
    }
  }
};

export const createLogger = (): Logger => ({
  beaconSendFailed(error: unknown): void {
    console.error(`${PREFIX} Failed to send beacon:`, error);
  },
  capturedError(type: string, ...args: unknown[]): void {
    console.error(`${PREFIX} ${type}:capture:`, ...args);
  },
  clearingRetryState(): void {
    console.log(`${PREFIX} Clearing retry state from URL to allow clean reload attempt`);
  },
  error(msg: string, ...args: unknown[]): void {
    console.error(`${PREFIX} ${msg}`, ...args);
  },
  fallbackAlreadyShown(error: unknown): void {
    console.error(
      `${PREFIX} Fallback UI was already shown. Not retrying to prevent infinite loop.`,
      error,
    );
  },
  fallbackInjectFailed(error: unknown): void {
    console.error(`${PREFIX} Failed to inject fallback UI`, error);
  },
  fallbackTargetNotFound(selector: string): void {
    console.error(`${PREFIX} Target element not found for selector: ${selector}`);
  },
  log(msg: string, ...args: unknown[]): void {
    console.log(`${PREFIX} ${msg}`, ...args);
  },
  logEvent(event: SPAGuardEvent): void {
    const level = eventLogConfig[event.name];
    const message = formatEvent(event);
    if (event.name === "chunk-error") {
      console[level](message, event.error);
    } else {
      console[level](message);
    }
  },
  noBeaconEndpoint(): void {
    console.warn(`${PREFIX} Report endpoint is not configured`);
  },
  noFallbackConfigured(): void {
    console.error(`${PREFIX} No fallback UI configured`);
  },
  retryLimitExceeded(attempt: number, max: number): void {
    console.log(`${PREFIX} Retry limit exceeded (${attempt}/${max}), marking as fallback shown`);
  },
  updatedRetryAttempt(attempt: number): void {
    console.log(`${PREFIX} Updated retry attempt to ${attempt} in URL for fallback UI`);
  },
  versionChanged(oldVersion: null | string, latestVersion: string): void {
    console.warn(`${PREFIX} Version changed: ${oldVersion} → ${latestVersion}`);
  },
  versionChangeDetected(oldVersion: null | string, latestVersion: string): void {
    console.warn(
      `${PREFIX} New version available (${oldVersion ?? "unknown"} → ${latestVersion}). Please refresh to get the latest version.`,
    );
  },
  versionCheckAlreadyRunning(): void {
    console.warn(`${PREFIX} Version check already running`);
  },
  versionCheckDisabled(): void {
    console.warn(`${PREFIX} Version checking disabled: no version configured`);
  },
  versionCheckFailed(error: unknown): void {
    console.error(`${PREFIX} Version check failed`, error);
  },
  versionCheckHttpError(status: number): void {
    console.warn(`${PREFIX} Version check HTTP error: ${status}`);
  },
  versionCheckParseError(): void {
    console.warn(`${PREFIX} Failed to parse version from HTML`);
  },
  versionCheckRequiresEndpoint(): void {
    console.warn(`${PREFIX} JSON version check mode requires endpoint`);
  },
  versionCheckStarted(mode: string, interval: number, version: string): void {
    console.log(
      `${PREFIX} Starting version check (mode: ${mode}, interval: ${interval}ms, current: ${version})`,
    );
  },
  versionCheckStopped(): void {
    console.log(`${PREFIX} Version check stopped`);
  },
  warn(msg: string, ...args: unknown[]): void {
    console.warn(`${PREFIX} ${msg}`, ...args);
  },
});
