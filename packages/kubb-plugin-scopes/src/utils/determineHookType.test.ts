import type { Operation } from "@kubb/oas";

import { describe, expect, it } from "vitest";

import { determineHookType } from "./determineHookType.js";

function mockOperation(method: string): Operation {
  return { method } as unknown as Operation;
}

describe("determineHookType", () => {
  it('returns "query" for GET method', () => {
    expect(determineHookType(mockOperation("GET"))).toBe("query");
  });

  it('returns "mutation" for POST method', () => {
    expect(determineHookType(mockOperation("POST"))).toBe("mutation");
  });

  it('returns "mutation" for PUT method', () => {
    expect(determineHookType(mockOperation("PUT"))).toBe("mutation");
  });

  it('returns "mutation" for PATCH method', () => {
    expect(determineHookType(mockOperation("PATCH"))).toBe("mutation");
  });

  it('returns "mutation" for DELETE method', () => {
    expect(determineHookType(mockOperation("DELETE"))).toBe("mutation");
  });

  it("handles lowercase method (case insensitivity)", () => {
    expect(determineHookType(mockOperation("get"))).toBe("query");
  });

  it("handles mixed case method", () => {
    expect(determineHookType(mockOperation("Get"))).toBe("query");
  });

  it('returns "mutation" for lowercase post', () => {
    expect(determineHookType(mockOperation("post"))).toBe("mutation");
  });
});
