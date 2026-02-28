import type { BeaconSchema } from "../../schema";

export class BeaconError extends Error {
  readonly appName: string | undefined;
  readonly errorMessage: string | undefined;
  readonly eventMessage: string | undefined;
  readonly eventName: string | undefined;
  readonly retryAttempt: number | undefined;
  readonly retryId: string | undefined;
  readonly serialized: string | undefined;

  constructor(beacon: BeaconSchema) {
    super(beacon.errorMessage ?? beacon.eventMessage ?? "Unknown beacon error");
    this.name = "BeaconError";
    this.appName = beacon.appName;
    this.errorMessage = beacon.errorMessage;
    this.eventMessage = beacon.eventMessage;
    this.eventName = beacon.eventName;
    this.retryAttempt = beacon.retryAttempt;
    this.retryId = beacon.retryId;
    this.serialized = beacon.serialized;
  }

  toJSON(): Record<string, unknown> {
    return {
      appName: this.appName,
      errorMessage: this.errorMessage,
      eventMessage: this.eventMessage,
      eventName: this.eventName,
      message: this.message,
      name: this.name,
      retryAttempt: this.retryAttempt,
      retryId: this.retryId,
      serialized: this.serialized,
    };
  }
}
