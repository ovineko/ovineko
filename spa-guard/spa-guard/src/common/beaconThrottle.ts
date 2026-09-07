import type { BeaconSchema } from "../schema";
import type { Options } from "./options";

import { beaconThrottleKey } from "./constants";
import { getOptions } from "./options";

const DEFAULT_MAX_PER_PAGE_LOAD = 20;
const DEFAULT_DEDUPE_WINDOW_MS = 300_000;
const MAX_RETAINED_KEYS = 256;

export type BeaconThrottleFlushHandler = (droppedCount: number) => void;

interface BeaconThrottleState {
  droppedCount: number;
  flushHandler?: BeaconThrottleFlushHandler;
  pagehideHandler?: () => void;
  reportedDroppedCount: number;
  seenKeys: Map<string, number>;
  sentCount: number;
  throttledBeaconSent: boolean;
  visibilityHandler?: () => void;
}

const createState = (): BeaconThrottleState => ({
  droppedCount: 0,
  reportedDroppedCount: 0,
  seenKeys: new Map<string, number>(),
  sentCount: 0,
  throttledBeaconSent: false,
});

const getState = (): BeaconThrottleState => {
  if (globalThis.window === undefined) {
    return createState();
  }
  const windowObject = globalThis.window as any;
  if (!windowObject[beaconThrottleKey]) {
    windowObject[beaconThrottleKey] = createState();
  }
  return windowObject[beaconThrottleKey] as BeaconThrottleState;
};

const removeFlushListeners = (state: BeaconThrottleState): void => {
  const windowObject = globalThis.window as any;
  if (windowObject === undefined || typeof windowObject.removeEventListener !== "function") {
    return;
  }
  if (state.pagehideHandler) {
    windowObject.removeEventListener("pagehide", state.pagehideHandler);
  }
  if (state.visibilityHandler && typeof windowObject.document?.removeEventListener === "function") {
    windowObject.document.removeEventListener("visibilitychange", state.visibilityHandler);
  }
};

const flush = (state: BeaconThrottleState): void => {
  if (
    !state.flushHandler ||
    state.droppedCount === 0 ||
    state.droppedCount === state.reportedDroppedCount
  ) {
    return;
  }
  state.flushHandler(state.droppedCount);
  state.reportedDroppedCount = state.droppedCount;
};

export const registerBeaconThrottleFlush = (handler: BeaconThrottleFlushHandler): void => {
  const state = getState();
  state.flushHandler ??= handler;

  const windowObject = globalThis.window as any;
  if (
    state.pagehideHandler ||
    windowObject === undefined ||
    typeof windowObject.addEventListener !== "function"
  ) {
    return;
  }

  state.pagehideHandler = () => flush(state);
  state.visibilityHandler = () => {
    if (windowObject.document?.visibilityState === "hidden") {
      flush(state);
    }
  };
  windowObject.addEventListener("pagehide", state.pagehideHandler);
  windowObject.document?.addEventListener?.("visibilitychange", state.visibilityHandler);
};

export const resetBeaconThrottle = (): void => {
  if (globalThis.window !== undefined) {
    const windowObject = globalThis.window as any;
    const state = windowObject[beaconThrottleKey] as BeaconThrottleState | undefined;
    if (state) {
      removeFlushListeners(state);
    }
    windowObject[beaconThrottleKey] = createState();
  }
};

const getMaxPerPageLoad = (value: unknown): number => {
  // JSON.stringify turns Infinity into null while build plugins inject the options object.
  if (value === null || value === 0 || value === Infinity) {
    return 0;
  }
  if (value === undefined || typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return DEFAULT_MAX_PER_PAGE_LOAD;
  }
  return value;
};

const getDedupeWindowMs = (value: unknown): number => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return DEFAULT_DEDUPE_WINDOW_MS;
  }
  return value;
};

const beaconKey = (beacon: BeaconSchema): string =>
  JSON.stringify([
    beacon.appName,
    beacon.eventName,
    beacon.errorType,
    beacon.url,
    beacon.errorMessage,
    beacon.eventMessage,
    beacon.errorContext,
    beacon.retryAttempt,
    beacon.retryId,
    beacon.httpStatus,
  ]);

const rememberKey = (
  state: BeaconThrottleState,
  key: string,
  now: number,
  windowMs: number,
): boolean => {
  const lastSeen = state.seenKeys.get(key);
  if (lastSeen !== undefined && now - lastSeen < windowMs) {
    return true;
  }

  state.seenKeys.delete(key);
  if (state.seenKeys.size >= MAX_RETAINED_KEYS) {
    const oldestKey = state.seenKeys.keys().next().value as string | undefined;
    if (oldestKey !== undefined) {
      state.seenKeys.delete(oldestKey);
    }
  }
  state.seenKeys.set(key, now);
  return false;
};

export const getBeaconThrottleDecision = (
  beacon: BeaconSchema,
  config: Options["reportBeacon"] = getOptions().reportBeacon,
): { dropped: number; send: boolean; throttled: boolean } => {
  const state = getState();
  if (config?.dedupe !== false) {
    const key = beaconKey(beacon);
    if (rememberKey(state, key, Date.now(), getDedupeWindowMs(config?.dedupeWindowMs))) {
      return { dropped: state.droppedCount, send: false, throttled: false };
    }
  }

  const max = getMaxPerPageLoad(config?.maxPerPageLoad);
  if (max !== 0 && max !== Infinity && state.sentCount >= max) {
    state.droppedCount += 1;
    if (!state.throttledBeaconSent) {
      state.throttledBeaconSent = true;
      return { dropped: state.droppedCount, send: true, throttled: true };
    }
    return { dropped: state.droppedCount, send: false, throttled: false };
  }

  state.sentCount += 1;
  return { dropped: state.droppedCount, send: true, throttled: false };
};
