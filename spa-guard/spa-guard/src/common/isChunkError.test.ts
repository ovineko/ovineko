import { describe, expect, it } from "vitest";

import { isChunkError } from "./isChunkError";

describe("isChunkError", () => {
  describe("chunk error patterns", () => {
    it("matches 'Failed to fetch dynamically imported module'", () => {
      expect(isChunkError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    });

    it("matches 'Importing a module script failed'", () => {
      expect(isChunkError(new Error("Importing a module script failed"))).toBe(true);
    });

    it("matches 'error loading dynamically imported module'", () => {
      expect(isChunkError(new Error("error loading dynamically imported module"))).toBe(true);
    });

    it("matches 'Unable to preload CSS'", () => {
      expect(isChunkError(new Error("Unable to preload CSS for /assets/chunk.css"))).toBe(true);
    });

    it("matches 'Loading chunk N failed'", () => {
      expect(isChunkError(new Error("Loading chunk 42 failed"))).toBe(true);
    });

    it("matches 'Loading CSS chunk N failed'", () => {
      expect(isChunkError(new Error("Loading CSS chunk 3 failed"))).toBe(true);
    });

    it("matches 'ChunkLoadError'", () => {
      expect(isChunkError(new Error("ChunkLoadError: loading chunk failed"))).toBe(true);
    });

    it("is case-insensitive for patterns", () => {
      expect(isChunkError(new Error("failed to fetch dynamically imported module"))).toBe(true);
      expect(isChunkError(new Error("CHUNKLOADERROR"))).toBe(true);
    });
  });

  describe("non-chunk errors are not matched", () => {
    it("does not match SyntaxError", () => {
      expect(isChunkError(new SyntaxError("Unexpected token <"))).toBe(false);
    });

    it("does not match generic 'Failed to fetch' (API/network error, not a chunk error)", () => {
      expect(isChunkError(new TypeError("Failed to fetch"))).toBe(false);
    });

    it("does not match TypeError unrelated to fetch", () => {
      expect(isChunkError(new TypeError("Cannot read property 'x' of undefined"))).toBe(false);
    });

    it("does not match CSP SecurityError", () => {
      const err = new Error("Refused to load because it violates the Content Security Policy");
      err.name = "SecurityError";
      expect(isChunkError(err)).toBe(false);
    });

    it("does not match ReferenceError", () => {
      expect(isChunkError(new ReferenceError("foo is not defined"))).toBe(false);
    });

    it("does not match errors containing 'nan' as a substring", () => {
      expect(isChunkError(new Error("Cannot access before initialization"))).toBe(false);
      expect(isChunkError(new Error("banana"))).toBe(false);
    });
  });

  describe("getErrorMessage input variants", () => {
    it("handles string errors", () => {
      expect(isChunkError("Failed to fetch dynamically imported module")).toBe(true);
    });

    it("handles non-chunk string errors", () => {
      expect(isChunkError("SyntaxError: unexpected token")).toBe(false);
    });

    it("handles plain objects with a message property", () => {
      expect(isChunkError({ message: "Failed to fetch dynamically imported module" })).toBe(true);
    });

    it("handles objects with a reason property (PromiseRejectionEvent-like)", () => {
      expect(
        isChunkError({ reason: new Error("Failed to fetch dynamically imported module") }),
      ).toBe(true);
    });

    it("handles nested reason chains", () => {
      expect(
        isChunkError({ reason: { message: "Failed to fetch dynamically imported module" } }),
      ).toBe(true);
    });

    it("returns false for null", () => {
      expect(isChunkError(null)).toBe(false);
    });

    it("returns false when the error message is an empty string", () => {
      expect(isChunkError("")).toBe(false);
    });

    it("returns false for objects without message or reason", () => {
      expect(isChunkError({ foo: "bar" })).toBe(false);
    });

    it("returns false for numbers", () => {
      expect(isChunkError(42)).toBe(false);
    });
  });
});
