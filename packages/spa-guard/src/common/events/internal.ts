import type { InternalConfig, SPAGuardEvent, SubscribeFn, UnsubscribeFn } from "./types";

import { eventSubscribersWindowKey, initializedKey, internalConfigWindowKey } from "../constants";

if (globalThis.window && !(globalThis.window as any)[eventSubscribersWindowKey]) {
  (globalThis.window as any)[eventSubscribersWindowKey] = new Set<SubscribeFn>();
}

if (globalThis.window && !(globalThis.window as any)[internalConfigWindowKey]) {
  (globalThis.window as any)[internalConfigWindowKey] = {
    defaultRetryEnabled: true,
    initialized: false,
    inlineScriptLoaded: false,
  } as InternalConfig;
}

export const subscribers: Set<SubscribeFn> =
  (globalThis.window as any)?.[eventSubscribersWindowKey] ?? new Set<SubscribeFn>();

export const internalConfig: InternalConfig = (globalThis.window as any)?.[
  internalConfigWindowKey
] ?? {
  defaultRetryEnabled: true,
  initialized: false,
  inlineScriptLoaded: false,
};

export const emitEvent = (event: SPAGuardEvent) => {
  subscribers.forEach((cb) => {
    try {
      cb(event);
    } catch {
      // Isolate subscriber errors so all subscribers receive the event
    }
  });
};

export const subscribe = (cb: SubscribeFn): UnsubscribeFn => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};

export const isInitialized = (): boolean => {
  return internalConfig.initialized;
};

export const markInitialized = (): void => {
  internalConfig.initialized = true;
  if (globalThis.window !== undefined) {
    (globalThis.window as any)[initializedKey] = true;
  }
};

export const disableDefaultRetry = (): void => {
  internalConfig.defaultRetryEnabled = false;
};

export const enableDefaultRetry = (): void => {
  internalConfig.defaultRetryEnabled = true;
};

export const isDefaultRetryEnabled = (): boolean => {
  return internalConfig.defaultRetryEnabled;
};
