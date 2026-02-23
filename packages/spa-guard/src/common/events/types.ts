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
  | (SPAGuardEventLazyRetrySuccess & { name: "lazy-retry-success" })
  | (SPAGuardEventRetryAttempt & { name: "retry-attempt" })
  | (SPAGuardEventRetryExhausted & { name: "retry-exhausted" })
  | (SPAGuardEventRetryReset & { name: "retry-reset" });

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
  name: "lazy-retry-attempt";
  /** Total number of attempts including the initial try (delays.length + 1). */
  totalAttempts: number;
}

/** Emitted when all module-level retry attempts are exhausted. */
export interface SPAGuardEventLazyRetryExhausted {
  name: "lazy-retry-exhausted";
  /** Total number of attempts that were made (delays.length + 1). */
  totalAttempts: number;
  /** Whether attemptReload() will be called after this event. */
  willReload: boolean;
}

/** Emitted when a module loads successfully after one or more retry attempts. */
export interface SPAGuardEventLazyRetrySuccess {
  /** 1-based retry number on which the import succeeded (1 = first retry). */
  attempt: number;
  name: "lazy-retry-success";
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

export type SubscribeFn = (event: SPAGuardEvent) => void;

export type UnsubscribeFn = () => void;
