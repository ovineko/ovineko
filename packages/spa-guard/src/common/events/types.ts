export type SPAGuardEvent =
  | (SPAGuardEventFallbackUIShown & { name: "fallback-ui-shown" })
  | (SPAGuardEventRetryAttempt & { name: "retry-attempt" })
  | (SPAGuardEventRetryExhausted & { name: "retry-exhausted" });

export interface SPAGuardEventFallbackUIShown {
  name: "fallback-ui-shown";
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

export type SubscribeFn = (event: SPAGuardEvent) => void;

export type UnsubscribeFn = () => void;
