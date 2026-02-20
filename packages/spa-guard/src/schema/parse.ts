import { Value } from "typebox/value";

import type { BeaconSchema } from ".";

import { beaconSchema } from ".";

export const parseBeacon = (value: unknown): BeaconSchema => {
  const cleaned = Value.Clean(beaconSchema, value);
  const isValid = Value.Check(beaconSchema, cleaned);

  if (!isValid) {
    const errors = [...Value.Errors(beaconSchema, cleaned)];
    throw new Error(`Beacon validation failed: ${JSON.stringify(errors)}`);
  }

  return cleaned as BeaconSchema;
};
