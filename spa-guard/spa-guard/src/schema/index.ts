export interface BeaconSchema {
  appName?: string;
  errorContext?: string;
  errorMessage?: string;
  errorType?: string;
  eventMessage?: string;
  eventName?: string;
  httpStatus?: number;
  retryAttempt?: number;
  retryId?: string;
  serialized?: string;
  url?: string;
}
