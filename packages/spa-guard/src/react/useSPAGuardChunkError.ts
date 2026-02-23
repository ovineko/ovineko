import { useCallback, useState } from "react";

import type { SPAGuardEventChunkError } from "../common/events/types";

import { useSPAGuardEvents } from "./useSPAGuardEvents";

export const useSPAGuardChunkError = (): null | SPAGuardEventChunkError => {
  const [chunkError, setChunkError] = useState<null | SPAGuardEventChunkError>(null);

  useSPAGuardEvents(
    useCallback((event) => {
      if (event.name === "chunk-error") {
        setChunkError(event);
      }
    }, []),
  );

  return chunkError;
};
