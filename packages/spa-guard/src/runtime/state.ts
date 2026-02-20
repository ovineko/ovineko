import type { UnsubscribeFn } from "../common/events/types";

import { subscribe } from "../common/events/internal";
import { getRetryStateFromUrl } from "../common/retryState";

export interface SpaGuardState {
  currentAttempt: number;
  isFallbackShown: boolean;
  isWaiting: boolean;
}

type StateSubscriber = (state: SpaGuardState) => void;

const getInitialStateFromUrl = (): SpaGuardState => {
  if (globalThis.window === undefined) {
    return { currentAttempt: 0, isFallbackShown: false, isWaiting: false };
  }

  const retryState = getRetryStateFromUrl();
  if (!retryState) {
    return { currentAttempt: 0, isFallbackShown: false, isWaiting: false };
  }
  if (retryState.retryAttempt === -1) {
    return { currentAttempt: 0, isFallbackShown: true, isWaiting: false };
  }
  return {
    currentAttempt: retryState.retryAttempt,
    isFallbackShown: false,
    isWaiting: false,
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
        currentAttempt: event.attempt,
        isFallbackShown: false,
        isWaiting: true,
      });

      break;
    }
    case "retry-exhausted": {
      updateState({
        currentAttempt: event.finalAttempt,
        isFallbackShown: false,
        isWaiting: false,
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
