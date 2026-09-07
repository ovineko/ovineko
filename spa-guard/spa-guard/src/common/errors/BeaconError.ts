import type { BeaconSchema } from "../../schema";

export class BeaconError extends Error {
  readonly appName: string | undefined;
  readonly errorContext: string | undefined;
  readonly errorMessage: string | undefined;
  readonly errorType: string | undefined;
  readonly eventMessage: string | undefined;
  readonly eventName: string | undefined;
  readonly httpStatus: number | undefined;
  readonly retryAttempt: number | undefined;
  readonly retryId: string | undefined;
  readonly serialized: string | undefined;
  readonly url: string | undefined;

  constructor(beacon: BeaconSchema) {
    super(
      beacon.errorMessage ??
        beacon.eventMessage ??
        (beacon.eventName
          ? `spa-guard: ${beacon.eventName}${beacon.errorType ? ` (${beacon.errorType})` : ""}${beacon.url ? `: ${beacon.url}` : ""}`
          : undefined) ??
        "Unknown beacon error",
    );
    this.name = "BeaconError";
    this.appName = beacon.appName;
    this.errorContext = beacon.errorContext;
    this.errorMessage = beacon.errorMessage;
    this.errorType = beacon.errorType;
    this.eventMessage = beacon.eventMessage;
    this.eventName = beacon.eventName;
    this.httpStatus = beacon.httpStatus;
    this.retryAttempt = beacon.retryAttempt;
    this.retryId = beacon.retryId;
    this.serialized = beacon.serialized;
    this.url = beacon.url;
  }

  toJSON(): Record<string, unknown> {
    return {
      appName: this.appName,
      errorContext: this.errorContext,
      errorMessage: this.errorMessage,
      errorType: this.errorType,
      eventMessage: this.eventMessage,
      eventName: this.eventName,
      httpStatus: this.httpStatus,
      message: this.message,
      name: this.name,
      retryAttempt: this.retryAttempt,
      retryId: this.retryId,
      serialized: this.serialized,
      url: this.url,
    };
  }
}
