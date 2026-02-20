import { logMessage } from "./log";
import { getOptions } from "./options";

let versionCheckInterval: null | ReturnType<typeof setInterval> = null;
let lastKnownVersion: null | string = null;

export const fetchRemoteVersion = async (mode: "html" | "json"): Promise<null | string> => {
  const options = getOptions();

  if (mode === "json") {
    const endpoint = options.checkVersion?.endpoint;
    if (!endpoint) {
      console.warn(logMessage("JSON version check mode requires endpoint"));
      return null;
    }

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    return data.version ?? null;
  }

  // HTML mode: re-fetch current page
  const response = await fetch(globalThis.location.href, {
    cache: "no-store",
    headers: { Accept: "text/html" },
  });
  const html = await response.text();

  // Parse: window.__SPA_GUARD_OPTIONS__={...,"version":"1.2.3",...}
  // Use a permissive pattern that handles nested objects in the JSON
  const match = html.match(/__SPA_GUARD_OPTIONS__\s*=\s*\{[\s\S]*?"version"\s*:\s*"([^"]+)"/);
  if (!match) {
    console.warn(logMessage("Failed to parse version from HTML"));
    return null;
  }

  return match[1] ?? null;
};

const onVersionChange = (oldVersion: null | string, latestVersion: string): void => {
  if (globalThis.window !== undefined) {
    globalThis.dispatchEvent(
      new CustomEvent("spa-guard:version-change", {
        detail: { latestVersion, oldVersion },
      }),
    );
  }

  console.warn(logMessage("New version available. Please refresh to get the latest version."));
};

const checkVersionOnce = async (mode: "html" | "json"): Promise<void> => {
  try {
    const remoteVersion = await fetchRemoteVersion(mode);

    if (remoteVersion && remoteVersion !== lastKnownVersion) {
      console.warn(logMessage(`Version changed: ${lastKnownVersion} → ${remoteVersion}`));

      onVersionChange(lastKnownVersion, remoteVersion);
      lastKnownVersion = remoteVersion;
    }
  } catch (error) {
    console.error(logMessage("Version check failed"), error);
  }
};

export const startVersionCheck = (): void => {
  if (globalThis.window === undefined) {
    return;
  }

  const options = getOptions();

  if (!options.version) {
    console.warn(logMessage("Version checking disabled: no version configured"));
    return;
  }

  if (versionCheckInterval !== null) {
    console.warn(logMessage("Version check already running"));
    return;
  }

  lastKnownVersion = options.version;

  const interval = options.checkVersion?.interval ?? 60_000;
  const mode = options.checkVersion?.mode ?? "html";

  console.log(
    logMessage(
      `Starting version check (mode: ${mode}, interval: ${interval}ms, current: ${lastKnownVersion})`,
    ),
  );

  versionCheckInterval = setInterval(async () => {
    await checkVersionOnce(mode);
  }, interval);
};

export const stopVersionCheck = (): void => {
  if (versionCheckInterval !== null) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
    console.log(logMessage("Version check stopped"));
  }
};

/** Reset internal state - exported for testing only */
export const _resetForTesting = (): void => {
  stopVersionCheck();
  lastKnownVersion = null;
};
