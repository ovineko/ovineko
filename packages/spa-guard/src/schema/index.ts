import { Type } from "typebox";

export const beaconSchema = Type.Object(
  {
    appName: Type.Optional(Type.String()),
    errorMessage: Type.Optional(Type.String()),
    eventMessage: Type.Optional(Type.String()),
    eventName: Type.Optional(Type.String()),
    retryAttempt: Type.Optional(Type.Number()),
    retryId: Type.Optional(Type.String()),
    serialized: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export type BeaconSchema = Type.Static<typeof beaconSchema>;
