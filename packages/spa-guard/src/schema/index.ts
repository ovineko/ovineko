import Type from "typebox";

export const beaconSchema = Type.Object({
  errorMessage: Type.Optional(Type.String()),
  eventMessage: Type.Optional(Type.String()),
  eventName: Type.Optional(Type.String()),
  serialized: Type.Optional(Type.String()),
});

export type BeaconSchema = Type.Static<typeof beaconSchema>;
