import { useEffect, useState } from "react";

import { getState, subscribeToState } from "../runtime";

export type { SpaGuardState } from "../runtime";

export const useSpaGuardState = () => {
  const [state, setState] = useState(() => {
    if (globalThis.window === undefined) {
      return { currentAttempt: 0, isFallbackShown: false, isWaiting: false };
    }
    return getState();
  });

  useEffect(() => {
    return subscribeToState(setState);
  }, []);

  return state;
};
