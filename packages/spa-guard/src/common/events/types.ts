export type SPAGuardEvent =
  | (SPAGuardEventFallbackUIShown & { name: "fallback-ui-shown" })
  | (SPAGuardEventLazyRetryAttempt & { name: "lazy-retry-attempt" })
  | (SPAGuardEventLazyRetryExhausted & { name: "lazy-retry-exhausted" })
  | (SPAGuardEventLazyRetrySuccess & { name: "lazy-retry-success" })
  | (SPAGuardEventRetryAttempt & { name: "retry-attempt" })
  | (SPAGuardEventRetryExhausted & { name: "retry-exhausted" })
  | (SPAGuardEventRetryReset & { name: "retry-reset" });

export interface SPAGuardEventFallbackUIShown {
  name: "fallback-ui-shown";
}

export interface SPAGuardEventLazyRetryAttempt {
  attempt: number;
  delay: number;
  name: "lazy-retry-attempt";
  totalAttempts: number;
}

export interface SPAGuardEventLazyRetryExhausted {
  name: "lazy-retry-exhausted";
  totalAttempts: number;
  willReload: boolean;
}

export interface SPAGuardEventLazyRetrySuccess {
  attemptNumber: number;
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
