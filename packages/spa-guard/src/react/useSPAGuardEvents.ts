import { useEffect, useRef } from "react";

import type { SPAGuardEvent } from "../common/events/types";

import { subscribe } from "../common/events/internal";

export const useSPAGuardEvents = (callback: (event: SPAGuardEvent) => void): void => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    return subscribe((event) => {
      callbackRef.current(event);
    });
  }, []);
};
