import { isChunkError } from "./isChunkError";
import { attemptReload } from "./reload";
import { getRetryInfoForBeacon } from "./retryState";
import { sendBeacon } from "./sendBeacon";
import { serializeError } from "./serializeError";

export interface HandleErrorOptions {
  autoRetryChunkErrors?: boolean;
  errorInfo?: React.ErrorInfo;
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

  onError?.(error);

  const isChunk = isChunkError(error);

  if (isChunk && autoRetryChunkErrors) {
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
