import { isChunkError } from "./isChunkError";
import { attemptReload } from "./reload";
import { getRetryInfoForBeacon } from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { serializeError } from "./serializeError";
import { shouldForceRetry, shouldIgnoreMessages } from "./shouldIgnore";

/** Minimal subset of React.ErrorInfo used for beacon serialization. */
export interface ErrorInfoLike {
  componentStack?: null | string;
  digest?: string;
}

export interface HandleErrorOptions {
  autoRetryChunkErrors?: boolean;
  errorInfo?: ErrorInfoLike;
  eventName: string;
  onError?: (error: unknown) => void;
  sendBeaconOnError?: boolean;
}

/**
 * Shared error handling logic with spa-guard integration.
 *
 * Detects chunk errors and automatically retries, or sends beacon for non-chunk errors.
 */
export const handleErrorWithSpaGuard = (error: unknown, options: HandleErrorOptions): void => {
  const {
    autoRetryChunkErrors = true,
    errorInfo,
    eventName,
    onError,
    sendBeaconOnError = true,
  } = options;

  try {
    onError?.(error);
  } catch {
    // User callback must not break core retry/reporting flow
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  if (shouldIgnoreMessages([errorMessage])) {
    return;
  }

  const isChunk = isChunkError(error);
  const isForceRetry = shouldForceRetry([errorMessage]);

  if ((isChunk || isForceRetry) && autoRetryChunkErrors) {
    attemptReload(error);
  } else if (sendBeaconOnError) {
    sendBeacon({
      errorMessage: error instanceof Error ? error.message : String(error),
      eventName,
      serialized: serializeError(errorInfo ? { error, errorInfo } : error),
      ...getRetryInfoForBeacon(),
    });
  }
};
