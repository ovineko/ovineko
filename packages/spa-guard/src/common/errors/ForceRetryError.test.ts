import { describe, expect, it } from "vitest";

import { FORCE_RETRY_MAGIC, ForceRetryError } from "./ForceRetryError";

describe("ForceRetryError", () => {
  it("is an instance of Error", () => {
    const error = new ForceRetryError("test");
    expect(error).toBeInstanceOf(Error);
  });

  it("is an instance of ForceRetryError", () => {
    const error = new ForceRetryError("test");
    expect(error).toBeInstanceOf(ForceRetryError);
  });

  it("has name set to ForceRetryError", () => {
    const error = new ForceRetryError("test");
    expect(error.name).toBe("ForceRetryError");
  });

  it("prepends magic substring to the message", () => {
    const error = new ForceRetryError("my custom error");
    expect(error.message).toBe(`${FORCE_RETRY_MAGIC}my custom error`);
  });

  it("contains the magic substring in the message", () => {
    const error = new ForceRetryError("anything");
    expect(error.message).toContain("__SPA_GUARD_FORCE_RETRY__");
  });

  it("handles empty message", () => {
    const error = new ForceRetryError("");
    expect(error.message).toBe(FORCE_RETRY_MAGIC);
  });

  it("handles undefined message (no argument)", () => {
    const error = new ForceRetryError();
    expect(error.message).toBe(FORCE_RETRY_MAGIC);
  });

  it("preserves the original message after the magic substring", () => {
    const original = "Stale module detected";
    const error = new ForceRetryError(original);
    expect(error.message).toBe(`${FORCE_RETRY_MAGIC}${original}`);
    expect(error.message.slice(FORCE_RETRY_MAGIC.length)).toBe(original);
  });
});

describe("FORCE_RETRY_MAGIC", () => {
  it("equals the expected magic string", () => {
    expect(FORCE_RETRY_MAGIC).toBe("__SPA_GUARD_FORCE_RETRY__");
  });
});
