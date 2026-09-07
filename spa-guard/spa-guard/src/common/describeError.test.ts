import { describe, expect, it } from "vitest";

import { describeError } from "./describeError";

describe("describeError", () => {
  it("uses the ordered message, name, and fallback chain", () => {
    expect(describeError(new Error("message"))).toBe("Error: message");
    expect(describeError({ name: "NetworkError" })).toBe("NetworkError rejection");
    expect(describeError({ detail: "useful" })).toBe("Non-Error rejection");
    expect(describeError(null)).toBe("null");
  });

  it.each([{}, { nested: { message: "inner" } }])(
    "does not expose generic coercion for %s",
    (reason) => {
      const description = describeError(reason);
      expect(description).not.toBe("[object Object]");
      expect(description).not.toBe("undefined");
    },
  );

  it("ignores a minified-looking constructor name", () => {
    const reason = Object.create({ constructor: { name: "e" } });
    reason.detail = "value";
    expect(describeError(reason)).toBe("Non-Error rejection");
  });

  it("preserves string rejection messages and includes other primitive values", () => {
    expect(describeError("some message")).toBe("some message");
    expect(describeError(42)).toBe("42");
    expect(describeError(false)).toBe("false");
    expect(describeError(undefined)).toBe("undefined");
  });

  it("bounds messages", () => {
    const description = describeError({ message: "x".repeat(500) });
    expect(description.length).toBeLessThanOrEqual(200);
    expect(description.endsWith("…")).toBe(true);
  });

  it("bounds name-based descriptions including their suffix", () => {
    const description = describeError({ name: "Network".repeat(100) });
    expect(description.length).toBeLessThanOrEqual(200);
    expect(description.endsWith("…")).toBe(true);
  });

  it("handles circular objects", () => {
    const reason: Record<string, unknown> = {};
    reason.self = reason;
    expect(describeError(reason)).toBe("Non-Error rejection");
  });

  it("does not expose arbitrary rejection fields in the message", () => {
    expect(describeError({ accessToken: "secret-value" })).not.toContain("secret-value");
  });

  it("does not throw for hostile coercion or property access", () => {
    const reason = Object.create(null, {
      message: {
        get: () => {
          throw new Error("blocked");
        },
      },
      toString: {
        value: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => describeError(reason)).not.toThrow();
    expect(describeError(reason)).toBe("Non-Error rejection");
  });
});
