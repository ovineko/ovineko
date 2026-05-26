import { describe, expect, it } from "vitest";

import type { BeaconSchema } from "../../schema";

import { BeaconError } from "./BeaconError";

const fullBeacon: BeaconSchema = {
  appName: "my-app",
  errorMessage: "Failed to fetch module",
  eventMessage: "Module load error detected",
  eventName: "module-error",
  retryAttempt: 2,
  retryId: "abc-123",
  serialized: '{"url":"https://example.com/chunk.js"}',
};

describe("BeaconError", () => {
  it("is an instance of Error", () => {
    const error = new BeaconError(fullBeacon);
    expect(error).toBeInstanceOf(Error);
  });

  it("is an instance of BeaconError", () => {
    const error = new BeaconError(fullBeacon);
    expect(error).toBeInstanceOf(BeaconError);
  });

  it("has name set to BeaconError", () => {
    const error = new BeaconError(fullBeacon);
    expect(error.name).toBe("BeaconError");
  });

  it("uses errorMessage as the Error message when available", () => {
    const error = new BeaconError(fullBeacon);
    expect(error.message).toBe("Failed to fetch module");
  });

  it("falls back to eventMessage when errorMessage is undefined", () => {
    const error = new BeaconError({
      eventMessage: "Something happened",
      eventName: "event",
    });
    expect(error.message).toBe("Something happened");
  });

  it("falls back to default message when both errorMessage and eventMessage are undefined", () => {
    const error = new BeaconError({ eventName: "event" });
    expect(error.message).toBe("Unknown beacon error");
  });

  it("exposes all beacon fields as typed properties from a full beacon", () => {
    const error = new BeaconError(fullBeacon);
    expect(error.appName).toBe("my-app");
    expect(error.errorMessage).toBe("Failed to fetch module");
    expect(error.eventMessage).toBe("Module load error detected");
    expect(error.eventName).toBe("module-error");
    expect(error.retryAttempt).toBe(2);
    expect(error.retryId).toBe("abc-123");
    expect(error.serialized).toBe('{"url":"https://example.com/chunk.js"}');
  });

  it("handles a partial beacon with only eventName", () => {
    const error = new BeaconError({ eventName: "init" });
    expect(error.appName).toBeUndefined();
    expect(error.errorMessage).toBeUndefined();
    expect(error.eventMessage).toBeUndefined();
    expect(error.eventName).toBe("init");
    expect(error.retryAttempt).toBeUndefined();
    expect(error.retryId).toBeUndefined();
    expect(error.serialized).toBeUndefined();
  });

  it("handles an empty beacon object", () => {
    const error = new BeaconError({});
    expect(error.message).toBe("Unknown beacon error");
    expect(error.appName).toBeUndefined();
    expect(error.eventName).toBeUndefined();
  });

  describe("toJSON", () => {
    it("returns a plain object with all properties from a full beacon", () => {
      const error = new BeaconError(fullBeacon);
      const json = error.toJSON();
      expect(json).toEqual({
        appName: "my-app",
        errorMessage: "Failed to fetch module",
        eventMessage: "Module load error detected",
        eventName: "module-error",
        message: "Failed to fetch module",
        name: "BeaconError",
        retryAttempt: 2,
        retryId: "abc-123",
        serialized: '{"url":"https://example.com/chunk.js"}',
      });
    });

    it("returns a plain object with undefined fields from a partial beacon", () => {
      const error = new BeaconError({ eventName: "init" });
      const json = error.toJSON();
      expect(json).toEqual({
        appName: undefined,
        errorMessage: undefined,
        eventMessage: undefined,
        eventName: "init",
        message: "Unknown beacon error",
        name: "BeaconError",
        retryAttempt: undefined,
        retryId: undefined,
        serialized: undefined,
      });
    });

    it("is serializable via JSON.stringify", () => {
      const error = new BeaconError(fullBeacon);
      const serialized = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(serialized);
      expect(parsed.name).toBe("BeaconError");
      expect(parsed.errorMessage).toBe("Failed to fetch module");
      expect(parsed.retryAttempt).toBe(2);
    });
  });
});
