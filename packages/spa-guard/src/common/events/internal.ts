import type { SPAGuardEvent, SubscribeFn, UnsubscribeFn } from "./types";

import { eventSubscribersWindowKey } from "../constants";

if (globalThis.window && !(globalThis.window as any)[eventSubscribersWindowKey]) {
  (globalThis.window as any)[eventSubscribersWindowKey] = new Set<SubscribeFn>();
}

export const subscribers: Set<SubscribeFn> =
  (globalThis.window as any)?.[eventSubscribersWindowKey] ?? new Set<SubscribeFn>();

export const emitEvent = (event: SPAGuardEvent) => {
  subscribers.forEach((cb) => cb(event));
};

export const subscribe = (cb: SubscribeFn): UnsubscribeFn => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};
