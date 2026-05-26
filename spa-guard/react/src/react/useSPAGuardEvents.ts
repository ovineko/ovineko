import { useEffect, useRef } from "react";

import type { SPAGuardEvent } from "@ovineko/spa-guard/_internal";

import { subscribe } from "@ovineko/spa-guard/_internal";

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
