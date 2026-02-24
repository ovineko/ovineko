import { describe, expect, it } from "vitest";

import { parseBeacon } from "./parse";

describe("parseBeacon", () => {
  describe("valid beacon parsing (all fields provided)", () => {
    it("parses a beacon with all optional fields present", () => {
      const input = {
        errorMessage: "chunk load failed",
        eventMessage: "error event message",
        eventName: "chunk-load-error",
        retryAttempt: 2,
        retryId: "abc-123",
        serialized: '{"type":"Error","message":"Failed to fetch"}',
      };

      const result = parseBeacon(input);

      expect(result).toEqual(input);
    });

    it("returns the cleaned value with correct types", () => {
      const input = {
        errorMessage: "test error",
        retryAttempt: 1,
        retryId: "retry-id-xyz",
      };

      const result = parseBeacon(input);

      expect(typeof result.errorMessage).toBe("string");
      expect(typeof result.retryAttempt).toBe("number");
      expect(typeof result.retryId).toBe("string");
    });

    it("preserves string values exactly as provided", () => {
      const input = {
        errorMessage: "exact error message",
        eventName: "exact-event-name",
        retryId: "exact-retry-id-12345",
        serialized: '{"key":"value with special chars: <>&"}',
      };

      const result = parseBeacon(input);

      expect(result.errorMessage).toBe("exact error message");
      expect(result.eventName).toBe("exact-event-name");
      expect(result.retryId).toBe("exact-retry-id-12345");
      expect(result.serialized).toBe('{"key":"value with special chars: <>&"}');
    });

    it("preserves numeric retryAttempt value exactly", () => {
      const result = parseBeacon({ retryAttempt: 5 });
      expect(result.retryAttempt).toBe(5);
    });

    it("parses beacon with retryAttempt = 0", () => {
      const result = parseBeacon({ retryAttempt: 0 });
      expect(result.retryAttempt).toBe(0);
    });
  });

  describe("invalid beacon rejection (missing required fields, wrong types)", () => {
    it("throws when errorMessage is a number instead of string", () => {
      expect(() => parseBeacon({ errorMessage: 42 })).toThrow("Beacon validation failed");
    });

    it("throws when eventMessage is a boolean instead of string", () => {
      expect(() => parseBeacon({ eventMessage: true })).toThrow("Beacon validation failed");
    });

    it("throws when eventName is an array instead of string", () => {
      expect(() => parseBeacon({ eventName: ["chunk-load-error"] })).toThrow(
        "Beacon validation failed",
      );
    });

    it("throws when retryAttempt is a string instead of number", () => {
      expect(() => parseBeacon({ retryAttempt: "not-a-number" })).toThrow(
        "Beacon validation failed",
      );
    });

    it("throws when retryId is a number instead of string", () => {
      expect(() => parseBeacon({ retryId: 12_345 })).toThrow("Beacon validation failed");
    });

    it("throws when serialized is an object instead of string", () => {
      expect(() => parseBeacon({ serialized: { type: "Error" } })).toThrow(
        "Beacon validation failed",
      );
    });

    it("includes 'Beacon validation failed' in the error message", () => {
      let thrownError: Error | undefined;

      try {
        parseBeacon({ errorMessage: 999 });
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toContain("Beacon validation failed");
    });

    it("includes validation error details in the thrown error", () => {
      let thrownError: Error | undefined;

      try {
        parseBeacon({ retryAttempt: "invalid" });
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError?.message).toMatch(/Beacon validation failed/);
    });
  });

  describe("optional field handling", () => {
    it("parses an empty object (all fields are optional)", () => {
      const result = parseBeacon({});
      expect(result).toEqual({});
    });

    it("parses a beacon with only errorMessage", () => {
      const result = parseBeacon({ errorMessage: "only error message" });
      expect(result).toEqual({ errorMessage: "only error message" });
    });

    it("parses a beacon with only eventMessage", () => {
      const result = parseBeacon({ eventMessage: "only event message" });
      expect(result).toEqual({ eventMessage: "only event message" });
    });

    it("parses a beacon with only eventName", () => {
      const result = parseBeacon({ eventName: "only-event-name" });
      expect(result).toEqual({ eventName: "only-event-name" });
    });

    it("parses a beacon with only retryAttempt", () => {
      const result = parseBeacon({ retryAttempt: 3 });
      expect(result).toEqual({ retryAttempt: 3 });
    });

    it("parses a beacon with only retryId", () => {
      const result = parseBeacon({ retryId: "only-retry-id" });
      expect(result).toEqual({ retryId: "only-retry-id" });
    });

    it("parses a beacon with only serialized", () => {
      const result = parseBeacon({ serialized: '{"error":"serialized"}' });
      expect(result).toEqual({ serialized: '{"error":"serialized"}' });
    });

    it("parses a beacon with a subset of fields", () => {
      const input = { errorMessage: "subset error", retryAttempt: 1, retryId: "id-abc" };
      const result = parseBeacon(input);
      expect(result).toEqual(input);
    });

    it("does not add undefined fields to the result for absent optional fields", () => {
      const result = parseBeacon({ errorMessage: "only error" });

      expect(Object.keys(result)).not.toContain("eventMessage");
      expect(Object.keys(result)).not.toContain("eventName");
      expect(Object.keys(result)).not.toContain("retryAttempt");
      expect(Object.keys(result)).not.toContain("retryId");
      expect(Object.keys(result)).not.toContain("serialized");
    });
  });

  describe("BeaconSchema validation integration", () => {
    it("validates beacon structure", () => {
      const validBeacon = {
        errorMessage: "test",
        retryAttempt: 1,
        retryId: "id-1",
        serialized: "{}",
      };

      expect(() => parseBeacon(validBeacon)).not.toThrow();
    });

    it("strips extra properties not in the schema", () => {
      const inputWithExtra = {
        anotherExtra: 999,
        errorMessage: "test error",
        unknownField: "extra-value",
      };

      const result = parseBeacon(inputWithExtra);

      expect(result).not.toHaveProperty("unknownField");
      expect(result).not.toHaveProperty("anotherExtra");
      expect(result).toEqual({ errorMessage: "test error" });
    });

    it("does not include unrecognized fields in the parsed result", () => {
      const result = parseBeacon({ eventName: "test", someNewField: "future-field" });

      const keys = Object.keys(result);
      expect(keys).toContain("eventName");
      expect(keys).not.toContain("someNewField");
    });

    it("validates all six schema fields when all are valid strings/numbers", () => {
      const allFields = {
        errorMessage: "error",
        eventMessage: "event msg",
        eventName: "event-name",
        retryAttempt: 0,
        retryId: "retry-1",
        serialized: "serialized-data",
      };

      const result = parseBeacon(allFields);

      expect(result.errorMessage).toBe("error");
      expect(result.eventMessage).toBe("event msg");
      expect(result.eventName).toBe("event-name");
      expect(result.retryAttempt).toBe(0);
      expect(result.retryId).toBe("retry-1");
      expect(result.serialized).toBe("serialized-data");
    });
  });

  describe("edge cases", () => {
    it("throws on null input", () => {
      expect(() => parseBeacon(null)).toThrow();
    });

    it("throws on undefined input", () => {
      expect(() => parseBeacon()).toThrow();
    });

    it("throws on string input", () => {
      expect(() => parseBeacon("not an object")).toThrow();
    });

    it("throws on number input", () => {
      expect(() => parseBeacon(42)).toThrow();
    });

    it("throws on array input", () => {
      expect(() => parseBeacon([])).toThrow();
    });

    it("throws on array with valid-looking beacon fields", () => {
      expect(() => parseBeacon([{ errorMessage: "test" }])).toThrow();
    });

    it("strips extra fields from an otherwise valid beacon", () => {
      const result = parseBeacon({
        errorMessage: "chunk load error",
        extraFieldA: "should be removed",
        extraFieldB: { nested: true },
        retryAttempt: 2,
      });

      expect(result.errorMessage).toBe("chunk load error");
      expect(result.retryAttempt).toBe(2);
      expect(result).not.toHaveProperty("extraFieldA");
      expect(result).not.toHaveProperty("extraFieldB");
    });

    it("handles empty string values for string fields", () => {
      const result = parseBeacon({
        errorMessage: "",
        eventMessage: "",
        eventName: "",
        retryId: "",
        serialized: "",
      });

      expect(result.errorMessage).toBe("");
      expect(result.eventMessage).toBe("");
      expect(result.eventName).toBe("");
      expect(result.retryId).toBe("");
      expect(result.serialized).toBe("");
    });

    it("handles retryAttempt = 0 as a valid zero value", () => {
      const result = parseBeacon({ retryAttempt: 0 });
      expect(result.retryAttempt).toBe(0);
    });

    it("handles large retryAttempt numbers", () => {
      const result = parseBeacon({ retryAttempt: 9999 });
      expect(result.retryAttempt).toBe(9999);
    });

    it("handles negative retryAttempt numbers (schema allows any number)", () => {
      const result = parseBeacon({ retryAttempt: -1 });
      expect(result.retryAttempt).toBe(-1);
    });
  });
});
