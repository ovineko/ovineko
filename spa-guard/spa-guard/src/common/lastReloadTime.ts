import type { RetryState } from "./retryState";

import { inMemoryLastReloadKey } from "./constants";

const STORAGE_KEY = "__spa_guard_last_reload_timestamp__";
const RESET_INFO_KEY = "__spa_guard_last_retry_reset__";

export interface LastReloadData {
  attemptNumber: number;
  retryId: string;
  timestamp: number;
}

export interface LastRetryResetInfo {
  previousRetryId: string;
  timestamp: number;
}

interface InMemoryLastReloadState {
  resetInfo: LastRetryResetInfo | null;
  storage: LastReloadData | null;
}

if (globalThis.window && !(globalThis.window as any)[inMemoryLastReloadKey]) {
  (globalThis.window as any)[inMemoryLastReloadKey] = {
    resetInfo: null,
    storage: null,
  } as InMemoryLastReloadState;
}

const getInMemoryState = (): InMemoryLastReloadState => {
  const w = globalThis.window as any;
  if (!w) {
    return { resetInfo: null, storage: null };
  }
  return (
    w[inMemoryLastReloadKey] ??
    (w[inMemoryLastReloadKey] = { resetInfo: null, storage: null } as InMemoryLastReloadState)
  );
};

const hasSessionStorage = (): boolean => {
  try {
    return globalThis.window !== undefined && typeof sessionStorage !== "undefined";
  } catch {
    return false;
  }
};

export const setLastReloadTime = (retryId: string, attemptNumber: number): void => {
  const data: LastReloadData = {
    attemptNumber,
    retryId,
    timestamp: Date.now(),
  };

  if (hasSessionStorage()) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      getInMemoryState().storage = data;
    }
  } else {
    getInMemoryState().storage = data;
  }
};

export const getLastReloadTime = (): LastReloadData | null => {
  if (hasSessionStorage()) {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as LastReloadData;
      }
    } catch {
      return getInMemoryState().storage;
    }
  }

  return getInMemoryState().storage;
};

export const clearLastReloadTime = (): void => {
  if (hasSessionStorage()) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  getInMemoryState().storage = null;
};

export const shouldResetRetryCycle = (
  retryState: RetryState,
  reloadDelays: number[],
  minTimeBetweenResets = 5000,
): boolean => {
  if (retryState.retryAttempt === 0) {
    return false;
  }

  const lastReload = getLastReloadTime();

  if (!lastReload) {
    return false;
  }

  if (lastReload.retryId !== retryState.retryId) {
    return false;
  }

  const lastReset = getLastRetryResetInfo();
  if (lastReset) {
    const timeSinceLastReset = Date.now() - lastReset.timestamp;

    if (timeSinceLastReset < minTimeBetweenResets) {
      return false;
    }
  }

  const timeSinceReload = Date.now() - lastReload.timestamp;
  const previousDelayIndex = lastReload.attemptNumber - 1;
  const previousDelay = reloadDelays[previousDelayIndex] ?? 1000;

  // Buffer accounts for page navigation + load time after the retry delay.
  // Without this, normal retry reloads (where page load exceeds the delay)
  // would incorrectly trigger a cycle reset.
  const PAGE_LOAD_BUFFER_MS = 30_000;

  return timeSinceReload > previousDelay + PAGE_LOAD_BUFFER_MS;
};

export const setLastRetryResetInfo = (previousRetryId: string): void => {
  const data: LastRetryResetInfo = {
    previousRetryId,
    timestamp: Date.now(),
  };

  if (hasSessionStorage()) {
    try {
      sessionStorage.setItem(RESET_INFO_KEY, JSON.stringify(data));
    } catch {
      getInMemoryState().resetInfo = data;
    }
  } else {
    getInMemoryState().resetInfo = data;
  }
};

export const getLastRetryResetInfo = (): LastRetryResetInfo | null => {
  if (hasSessionStorage()) {
    try {
      const stored = sessionStorage.getItem(RESET_INFO_KEY);
      if (stored) {
        return JSON.parse(stored) as LastRetryResetInfo;
      }
    } catch {
      return getInMemoryState().resetInfo;
    }
  }

  return getInMemoryState().resetInfo;
};

export const clearLastRetryResetInfo = (): void => {
  if (hasSessionStorage()) {
    try {
      sessionStorage.removeItem(RESET_INFO_KEY);
    } catch {
      // Ignore
    }
  }

  getInMemoryState().resetInfo = null;
};
