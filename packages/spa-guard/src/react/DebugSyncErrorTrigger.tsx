import { useEffect, useState } from "react";

import { debugSyncErrorEventType } from "../common/constants";

/**
 * Renders nothing normally. When a CustomEvent of type debugSyncErrorEventType
 * is dispatched on window, this component stores the error in state and throws
 * it during the next render, allowing a parent React Error Boundary to catch it.
 *
 * Place this component inside your ErrorBoundary:
 *
 *   <ErrorBoundary fallback={<CrashPage />}>
 *     <DebugSyncErrorTrigger />
 *     <App />
 *   </ErrorBoundary>
 */
export function DebugSyncErrorTrigger(): null {
  const [error, setError] = useState<Error | null>(null);

  // eslint-disable-next-line fsecond/valid-event-listener -- Intentional: listens on globalThis for cross-framework CustomEvent bridge, not a DOM element
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ error: Error }>).detail;
      if (detail?.error instanceof Error) {
        setError(detail.error);
      }
    };
    globalThis.addEventListener(debugSyncErrorEventType, handler);
    return () => {
      globalThis.removeEventListener(debugSyncErrorEventType, handler);
    };
  }, []);

  if (error) {
    throw error;
  }

  return null;
}
