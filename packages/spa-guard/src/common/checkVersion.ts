import { getLogger } from "./events/internal";
import { getOptions } from "./options";

let versionCheckInterval: null | ReturnType<typeof setInterval> = null;
let versionCheckTimeout: null | ReturnType<typeof setTimeout> = null;
let lastKnownVersion: null | string = null;
let lastCheckTimestamp: null | number = null;
let visibilityHandler: (() => void) | null = null;
let focusHandler: (() => void) | null = null;
let blurHandler: (() => void) | null = null;
let checkInProgress = false;
let runEpoch = 0;

const fetchJsonVersion = async (): Promise<null | string> => {
  const endpoint = getOptions().checkVersion?.endpoint;
  if (!endpoint) {
    getLogger()?.versionCheckRequiresEndpoint();
    return null;
  }

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    getLogger()?.versionCheckHttpError(response.status);
    return null;
  }
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) {
    return null;
  }
  return "version" in data && typeof data.version === "string" ? data.version : null;
};

const fetchHtmlVersion = async (): Promise<null | string> => {
  const url = new URL(globalThis.location.href);
  url.search = "";
  url.hash = "";
  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "text/html" },
  });
  if (!response.ok) {
    getLogger()?.versionCheckHttpError(response.status);
    return null;
  }
  const html = await response.text();

  // Parse: window.__SPA_GUARD_OPTIONS__={...,"version":"1.2.3",...}
  const match = html.match(/__SPA_GUARD_OPTIONS__\s*=\s*\{[\s\S]*?"version"\s*:\s*"([^"]+)"/);
  if (!match) {
    getLogger()?.versionCheckParseError();
    return null;
  }

  return match[1] ?? null;
};

export const fetchRemoteVersion = async (mode: "html" | "json"): Promise<null | string> => {
  return mode === "json" ? fetchJsonVersion() : fetchHtmlVersion();
};

const onVersionChange = (oldVersion: null | string, latestVersion: string): void => {
  if (globalThis.window !== undefined) {
    globalThis.dispatchEvent(
      new CustomEvent("spa-guard:version-change", {
        detail: { latestVersion, oldVersion },
      }),
    );
  }

  getLogger()?.versionChangeDetected(oldVersion, latestVersion);

  if (getOptions().checkVersion?.onUpdate !== "event") {
    globalThis.location.reload();
  }
};

const checkVersionOnce = async (mode: "html" | "json"): Promise<void> => {
  if (checkInProgress) {
    return;
  }
  checkInProgress = true;
  const epochAtStart = runEpoch;
  try {
    const remoteVersion = await fetchRemoteVersion(mode);

    if (epochAtStart !== runEpoch) {
      return;
    }

    if (remoteVersion && remoteVersion !== lastKnownVersion) {
      const oldVersion = lastKnownVersion;
      lastKnownVersion = remoteVersion;
      onVersionChange(oldVersion, remoteVersion);
    }
  } catch (error) {
    getLogger()?.versionCheckFailed(error);
  } finally {
    if (epochAtStart === runEpoch) {
      checkInProgress = false;
    }
  }
};

const startPolling = (mode: "html" | "json", interval: number): void => {
  clearTimers();
  versionCheckInterval = setInterval(async () => {
    lastCheckTimestamp = Date.now();
    await checkVersionOnce(mode);
  }, interval);
};

const clearTimers = (): void => {
  if (versionCheckInterval !== null) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
  }
  if (versionCheckTimeout !== null) {
    clearTimeout(versionCheckTimeout);
    versionCheckTimeout = null;
  }
};

const handleVisibilityHidden = (): void => {
  clearTimers();
  getLogger()?.versionCheckPaused();
};

const handleResume = (mode: "html" | "json", interval: number): void => {
  // If timers are already running (from a prior resume), don't restart them
  if (versionCheckInterval !== null || versionCheckTimeout !== null) {
    return;
  }

  const elapsed = Date.now() - (lastCheckTimestamp ?? 0);

  if (elapsed >= interval) {
    getLogger()?.versionCheckResumedImmediate();
    lastCheckTimestamp = Date.now();
    void checkVersionOnce(mode);
    startPolling(mode, interval);
    return;
  }

  getLogger()?.versionCheckResumed();
  const remaining = interval - elapsed;
  versionCheckTimeout = setTimeout(() => {
    versionCheckTimeout = null;
    lastCheckTimestamp = Date.now();
    void checkVersionOnce(mode);
    startPolling(mode, interval);
  }, remaining);
};

export const startVersionCheck = (): void => {
  if (globalThis.window === undefined) {
    return;
  }

  const options = getOptions();

  if (!options.version) {
    getLogger()?.versionCheckDisabled();
    return;
  }

  if (versionCheckInterval !== null || visibilityHandler !== null) {
    getLogger()?.versionCheckAlreadyRunning();
    return;
  }

  runEpoch++;
  lastKnownVersion = options.version;

  const interval = options.checkVersion?.interval ?? 300_000;
  const mode = options.checkVersion?.mode ?? "html";

  getLogger()?.versionCheckStarted(mode, interval, lastKnownVersion);

  // Only start polling if tab is visible and window is focused
  const isTabVisible = document.visibilityState === "visible";
  const isWindowFocused = document.hasFocus();

  if (isTabVisible && isWindowFocused) {
    lastCheckTimestamp = Date.now();
    startPolling(mode, interval);
  } else {
    lastCheckTimestamp = 0;
    getLogger()?.versionCheckPaused();
  }

  visibilityHandler = () => {
    if (document.visibilityState === "hidden") {
      handleVisibilityHidden();
    } else {
      handleResume(mode, interval);
    }
  };

  focusHandler = () => {
    handleResume(mode, interval);
  };

  blurHandler = () => {
    handleVisibilityHidden();
  };

  document.addEventListener("visibilitychange", visibilityHandler);
  globalThis.addEventListener("focus", focusHandler);
  globalThis.addEventListener("blur", blurHandler);
};

export const stopVersionCheck = (): void => {
  runEpoch++;
  checkInProgress = false;

  const wasRunning =
    versionCheckInterval !== null || versionCheckTimeout !== null || visibilityHandler !== null;

  clearTimers();

  if (visibilityHandler !== null) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }

  if (focusHandler !== null) {
    globalThis.removeEventListener("focus", focusHandler);
    focusHandler = null;
  }

  if (blurHandler !== null) {
    globalThis.removeEventListener("blur", blurHandler);
    blurHandler = null;
  }

  if (wasRunning) {
    getLogger()?.versionCheckStopped();
  }
};

/** Reset internal state - exported for testing only */
export const _resetForTesting = (): void => {
  stopVersionCheck();
  lastKnownVersion = null;
  lastCheckTimestamp = null;
  checkInProgress = false;
  runEpoch = 0;
};
