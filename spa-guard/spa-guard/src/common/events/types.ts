export interface EmitOptions {
  silent?: boolean;
}

export interface InternalConfig {
  defaultRetryEnabled: boolean;
  initialized: boolean;
}

export type SPAGuardEvent =
  | (SPAGuardEventChunkError & { name: "chunk-error" })
  | (SPAGuardEventFallbackUIShown & { name: "fallback-ui-shown" })
  | (SPAGuardEventLazyRetryAttempt & { name: "lazy-retry-attempt" })
  | (SPAGuardEventLazyRetryExhausted & { name: "lazy-retry-exhausted" })
  | (SPAGuardEventLazyRetryStart & { name: "lazy-retry-start" })
  | (SPAGuardEventLazyRetrySuccess & { name: "lazy-retry-success" })
  | (SPAGuardEventRetryAttempt & { name: "retry-attempt" })
  | (SPAGuardEventRetryExhausted & { name: "retry-exhausted" })
  | (SPAGuardEventRetryReset & { name: "retry-reset" })
  | (SPAGuardEventStaticAssetLoadFailed & { name: "static-asset-load-failed" });

export interface SPAGuardEventChunkError {
  error: unknown;
  isRetrying: boolean;
  name: "chunk-error";
}

export interface SPAGuardEventFallbackUIShown {
  name: "fallback-ui-shown";
}

/** Emitted before each module-level retry attempt initiated by retryImport. */
export interface SPAGuardEventLazyRetryAttempt {
  /** 1-based index of the current retry attempt. */
  attempt: number;
  /** Delay in milliseconds before this retry attempt. */
  delay: number;
  /** The error that caused the previous attempt to fail. */
  error?: unknown;
  name: "lazy-retry-attempt";
  /** Total number of attempts including the initial try (delays.length + 1). */
  totalAttempts: number;
}

/** Emitted when all module-level retry attempts are exhausted. */
export interface SPAGuardEventLazyRetryExhausted {
  /** The final error after all attempts failed. */
  error: unknown;
  name: "lazy-retry-exhausted";
  /** Total number of attempts that were made (delays.length + 1). */
  totalAttempts: number;
  /** Whether attemptReload() will be called after this event. */
  willReload: boolean;
}

/** Emitted once before the first import attempt, when retries are configured. */
export interface SPAGuardEventLazyRetryStart {
  name: "lazy-retry-start";
  /** Total number of attempts that will be made (delays.length + 1). */
  totalAttempts: number;
}

/** Emitted when a module loads successfully after one or more retry attempts. */
export interface SPAGuardEventLazyRetrySuccess {
  /** 1-based retry number on which the import succeeded (1 = first retry). */
  attempt: number;
  name: "lazy-retry-success";
  /** Total time in milliseconds from first attempt to success. */
  totalTime?: number;
}

export interface SPAGuardEventRetryAttempt {
  attempt: number;
  delay: number;
  name: "retry-attempt";
  retryId: string;
}

export interface SPAGuardEventRetryExhausted {
  finalAttempt: number;
  name: "retry-exhausted";
  retryId: string;
}

export interface SPAGuardEventRetryReset {
  name: "retry-reset";
  previousAttempt: number;
  previousRetryId: string;
  timeSinceReload: number;
}

/** Emitted when a hashed static asset (script/link) fails to load, likely due to a stale deployment. */
export interface SPAGuardEventStaticAssetLoadFailed {
  name: "static-asset-load-failed";
  /** The URL of the asset that failed to load. */
  url: string;
}

export type SubscribeFn = (event: SPAGuardEvent) => void;

export type UnsubscribeFn = () => void;
