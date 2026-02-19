import { Value } from "typebox/value";

import { beaconSchema } from ".";

export const parseBeacon = (value: unknown) => {
  const cleaned = Value.Clean(beaconSchema, value);
  return Value.Decode(beaconSchema, cleaned);
};
