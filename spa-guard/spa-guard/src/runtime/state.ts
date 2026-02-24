import type { UnsubscribeFn } from "../common/events/types";

import { subscribe } from "../common/events/internal";
import { getLastRetryResetInfo } from "../common/lastReloadTime";
import { getRetryAttemptFromUrl, getRetryStateFromUrl } from "../common/retryState";

export interface SpaGuardState {
  currentAttempt: number;
  isFallbackShown: boolean;
  isWaiting: boolean;
  /**
   * ID of the previous retry cycle before reset.
   * Undefined if no reset has occurred yet.
   */
  lastResetRetryId?: string;
  /**
   * Timestamp of the last retry cycle reset.
   * Undefined if no reset has occurred yet.
   */
  lastRetryResetTime?: number;
}

type StateSubscriber = (state: SpaGuardState) => void;

const getInitialStateFromUrl = (): SpaGuardState => {
  const resetInfo = getLastRetryResetInfo();

  if (globalThis.window === undefined) {
    return {
      currentAttempt: 0,
      isFallbackShown: false,
      isWaiting: false,
      lastResetRetryId: resetInfo?.previousRetryId,
      lastRetryResetTime: resetInfo?.timestamp,
    };
  }

  const retryState = getRetryStateFromUrl();
  if (!retryState) {
    // useRetryId: false mode only sets spaGuardRetryAttempt without spaGuardRetryId.
    // Fall back to reading the attempt param alone so UI state is accurate after reload.
    const attempt = getRetryAttemptFromUrl();
    if (attempt !== null) {
      return {
        currentAttempt: attempt,
        isFallbackShown: false,
        isWaiting: false,
        lastResetRetryId: resetInfo?.previousRetryId,
        lastRetryResetTime: resetInfo?.timestamp,
      };
    }
    return {
      currentAttempt: 0,
      isFallbackShown: false,
      isWaiting: false,
      lastResetRetryId: resetInfo?.previousRetryId,
      lastRetryResetTime: resetInfo?.timestamp,
    };
  }
  if (retryState.retryAttempt === -1) {
    return {
      currentAttempt: 0,
      isFallbackShown: true,
      isWaiting: false,
      lastResetRetryId: resetInfo?.previousRetryId,
      lastRetryResetTime: resetInfo?.timestamp,
    };
  }
  return {
    currentAttempt: retryState.retryAttempt,
    isFallbackShown: false,
    isWaiting: false,
    lastResetRetryId: resetInfo?.previousRetryId,
    lastRetryResetTime: resetInfo?.timestamp,
  };
};

let currentState: SpaGuardState = getInitialStateFromUrl();
const stateSubscribers = new Set<StateSubscriber>();

const updateState = (nextState: SpaGuardState): void => {
  currentState = nextState;
  stateSubscribers.forEach((cb) => cb(currentState));
};

// Subscribe to events and update state
subscribe((event) => {
  switch (event.name) {
    case "fallback-ui-shown": {
      updateState({
        ...currentState,
        isFallbackShown: true,
      });

      break;
    }
    case "retry-attempt": {
      updateState({
        ...currentState,
        currentAttempt: event.attempt,
        isFallbackShown: false,
        isWaiting: true,
      });

      break;
    }
    case "retry-exhausted": {
      updateState({
        ...currentState,
        currentAttempt: event.finalAttempt,
        isFallbackShown: false,
        isWaiting: false,
      });

      break;
    }
    case "retry-reset": {
      updateState({
        ...currentState,
        currentAttempt: 0,
        isFallbackShown: false,
        isWaiting: false,
        lastResetRetryId: event.previousRetryId,
        lastRetryResetTime: Date.now(),
      });

      break;
    }
    // No default
  }
});

export const getState = (): SpaGuardState => currentState;

export const subscribeToState = (cb: StateSubscriber): UnsubscribeFn => {
  // Immediately invoke callback with current state
  cb(currentState);

  // Subscribe to future state changes
  stateSubscribers.add(cb);

  // Return unsubscribe function
  return () => {
    stateSubscribers.delete(cb);
  };
};
