import type { RetryState } from "./retryState";

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

let inMemoryStorage: LastReloadData | null = null;
let inMemoryResetInfo: LastRetryResetInfo | null = null;

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
      inMemoryStorage = data;
    }
  } else {
    inMemoryStorage = data;
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
      return inMemoryStorage;
    }
  }

  return inMemoryStorage;
};

export const clearLastReloadTime = (): void => {
  if (hasSessionStorage()) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  inMemoryStorage = null;
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

  return timeSinceReload > previousDelay;
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
      inMemoryResetInfo = data;
    }
  } else {
    inMemoryResetInfo = data;
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
      return inMemoryResetInfo;
    }
  }

  return inMemoryResetInfo;
};

export const clearLastRetryResetInfo = (): void => {
  if (hasSessionStorage()) {
    try {
      sessionStorage.removeItem(RESET_INFO_KEY);
    } catch {
      // Ignore
    }
  }

  inMemoryResetInfo = null;
};
