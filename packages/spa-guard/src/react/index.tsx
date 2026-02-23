/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";

import { getState, subscribeToState } from "../runtime";

export { ForceRetryError } from "../common/errors/ForceRetryError";
export type { SpaGuardState } from "../runtime";
export { DebugSyncErrorTrigger } from "./DebugSyncErrorTrigger";
export { lazyWithRetry } from "./lazyWithRetry";
export type { LazyRetryOptions } from "./types";
export { useSPAGuardChunkError } from "./useSPAGuardChunkError";
export { useSPAGuardEvents } from "./useSPAGuardEvents";

export const useSpaGuardState = () => {
  const [state, setState] = useState(() => {
    if (globalThis.window === undefined) {
      return {
        currentAttempt: 0,
        isFallbackShown: false,
        isWaiting: false,
      };
    }
    return getState();
  });

  useEffect(() => {
    return subscribeToState(setState);
  }, []);

  return state;
};
