import { versionCheckStateWindowKey } from "./constants";
import { getLogger } from "./events/internal";
import { getOptions } from "./options";
import { extractVersionFromHtml } from "./parseVersion";

interface VersionCheckState {
  blurHandler: (() => void) | null;
  checkInProgress: boolean;
  focusHandler: (() => void) | null;
  lastCheckTimestamp: null | number;
  lastKnownVersion: null | string;
  runEpoch: number;
  versionCheckInterval: null | ReturnType<typeof setInterval>;
  versionCheckTimeout: null | ReturnType<typeof setTimeout>;
  visibilityHandler: (() => void) | null;
}

const createInitialState = (): VersionCheckState => ({
  blurHandler: null,
  checkInProgress: false,
  focusHandler: null,
  lastCheckTimestamp: null,
  lastKnownVersion: null,
  runEpoch: 0,
  versionCheckInterval: null,
  versionCheckTimeout: null,
  visibilityHandler: null,
});

if (globalThis.window && !(globalThis.window as any)[versionCheckStateWindowKey]) {
  (globalThis.window as any)[versionCheckStateWindowKey] = createInitialState();
}

const getState = (): VersionCheckState => {
  return (
    (globalThis.window as any)?.[versionCheckStateWindowKey] ??
    ((globalThis.window as any)[versionCheckStateWindowKey] = createInitialState())
  );
};

const fetchJsonVersion = async (): Promise<null | string> => {
  const endpoint = getOptions().checkVersion?.endpoint;
  if (!endpoint) {
    getLogger()?.versionCheckRequiresEndpoint();
    return null;
  }

  const response = await fetch(endpoint, {
    cache: getOptions().checkVersion?.cache ?? "no-store",
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
    cache: getOptions().checkVersion?.cache ?? "no-store",
    headers: { Accept: "text/html" },
  });
  if (!response.ok) {
    getLogger()?.versionCheckHttpError(response.status);
    return null;
  }
  const html = await response.text();
  const version = extractVersionFromHtml(html);

  if (!version) {
    getLogger()?.versionCheckParseError();
    return null;
  }

  return version;
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
  const s = getState();
  if (s.checkInProgress) {
    return;
  }
  s.checkInProgress = true;
  const epochAtStart = s.runEpoch;
  try {
    const remoteVersion = await fetchRemoteVersion(mode);

    if (epochAtStart !== s.runEpoch) {
      return;
    }

    if (remoteVersion && remoteVersion !== s.lastKnownVersion) {
      const oldVersion = s.lastKnownVersion;
      s.lastKnownVersion = remoteVersion;
      onVersionChange(oldVersion, remoteVersion);
    }
  } catch (error) {
    getLogger()?.versionCheckFailed(error);
  } finally {
    if (epochAtStart === s.runEpoch) {
      s.checkInProgress = false;
    }
  }
};

const startPolling = (mode: "html" | "json", interval: number): void => {
  const s = getState();
  clearTimers();
  s.versionCheckInterval = setInterval(async () => {
    s.lastCheckTimestamp = Date.now();
    await checkVersionOnce(mode);
  }, interval);
};

const clearTimers = (): void => {
  const s = getState();
  if (s.versionCheckInterval !== null) {
    clearInterval(s.versionCheckInterval);
    s.versionCheckInterval = null;
  }
  if (s.versionCheckTimeout !== null) {
    clearTimeout(s.versionCheckTimeout);
    s.versionCheckTimeout = null;
  }
};

const handleVisibilityHidden = (): void => {
  clearTimers();
  getLogger()?.versionCheckPaused();
};

const handleResume = (mode: "html" | "json", interval: number): void => {
  const s = getState();
  // If timers are already running (from a prior resume), don't restart them
  if (s.versionCheckInterval !== null || s.versionCheckTimeout !== null) {
    return;
  }

  const elapsed = Date.now() - (s.lastCheckTimestamp ?? 0);

  if (elapsed >= interval) {
    getLogger()?.versionCheckResumedImmediate();
    s.lastCheckTimestamp = Date.now();
    void checkVersionOnce(mode);
    startPolling(mode, interval);
    return;
  }

  getLogger()?.versionCheckResumed();
  const remaining = interval - elapsed;
  s.versionCheckTimeout = setTimeout(() => {
    s.versionCheckTimeout = null;
    s.lastCheckTimestamp = Date.now();
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

  const s = getState();

  if (s.versionCheckInterval !== null || s.visibilityHandler !== null) {
    getLogger()?.versionCheckAlreadyRunning();
    return;
  }

  s.runEpoch++;
  s.lastKnownVersion = options.version;

  const interval = options.checkVersion?.interval ?? 300_000;
  const mode = options.checkVersion?.mode ?? "html";

  getLogger()?.versionCheckStarted(mode, interval, s.lastKnownVersion);

  // Only start polling if tab is visible and window is focused
  const isTabVisible = document.visibilityState === "visible";
  const isWindowFocused = document.hasFocus();

  if (isTabVisible && isWindowFocused) {
    s.lastCheckTimestamp = Date.now();
    startPolling(mode, interval);
  } else {
    s.lastCheckTimestamp = 0;
    getLogger()?.versionCheckPaused();
  }

  s.visibilityHandler = () => {
    if (document.visibilityState === "hidden") {
      handleVisibilityHidden();
    } else {
      handleResume(mode, interval);
    }
  };

  s.focusHandler = () => {
    handleResume(mode, interval);
  };

  s.blurHandler = () => {
    handleVisibilityHidden();
  };

  document.addEventListener("visibilitychange", s.visibilityHandler);
  globalThis.addEventListener("focus", s.focusHandler);
  globalThis.addEventListener("blur", s.blurHandler);
};

export const stopVersionCheck = (): void => {
  if (globalThis.window === undefined) {
    return;
  }
  const s = getState();
  s.runEpoch++;
  s.checkInProgress = false;

  const wasRunning =
    s.versionCheckInterval !== null ||
    s.versionCheckTimeout !== null ||
    s.visibilityHandler !== null;

  clearTimers();

  if (s.visibilityHandler !== null) {
    document.removeEventListener("visibilitychange", s.visibilityHandler);
    s.visibilityHandler = null;
  }

  if (s.focusHandler !== null) {
    globalThis.removeEventListener("focus", s.focusHandler);
    s.focusHandler = null;
  }

  if (s.blurHandler !== null) {
    globalThis.removeEventListener("blur", s.blurHandler);
    s.blurHandler = null;
  }

  if (wasRunning) {
    getLogger()?.versionCheckStopped();
  }
};

/** Reset internal state - exported for testing only */
export const _resetForTesting = (): void => {
  stopVersionCheck();
  if (globalThis.window) {
    (globalThis.window as any)[versionCheckStateWindowKey] = createInitialState();
  }
};
