export interface BeaconSchema {
  appName?: string;
  errorMessage?: string;
  eventMessage?: string;
  eventName?: string;
  retryAttempt?: number;
  retryId?: string;
  serialized?: string;
}
