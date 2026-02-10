import { describe, expect, it, vi } from "vitest";

import { safeDecodeURIComponent, URLParseError } from "./validation";

describe("validation", () => {
  describe("safeDecodeURIComponent", () => {
    it("should decode valid URI components", () => {
      expect(safeDecodeURIComponent("hello%20world")).toBe("hello world");
      expect(safeDecodeURIComponent("100%25")).toBe("100%");
      expect(safeDecodeURIComponent("%E2%9C%93")).toBe("✓");
    });

    it("should decode complex UTF-8 sequences", () => {
      expect(safeDecodeURIComponent("%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82")).toBe("привет");
      expect(safeDecodeURIComponent("%F0%9F%98%80")).toBe("😀");
    });

    it("should return original value for invalid encoding", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const invalid = "hello%world";
      expect(safeDecodeURIComponent(invalid)).toBe(invalid);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to decode URI component"),
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it("should handle edge cases", () => {
      expect(safeDecodeURIComponent("")).toBe("");
      expect(safeDecodeURIComponent("no-encoding")).toBe("no-encoding");
      expect(safeDecodeURIComponent("123")).toBe("123");
    });

    it("should handle partially encoded strings", () => {
      expect(safeDecodeURIComponent("hello%20world%20test")).toBe("hello world test");
      expect(safeDecodeURIComponent("a%2Bb%2Bc")).toBe("a+b+c");
    });

    it("should handle special characters", () => {
      expect(safeDecodeURIComponent("%21%40%23%24")).toBe("!@#$");
      expect(safeDecodeURIComponent("%28%29%5B%5D")).toBe("()[]");
    });
  });

  describe("URLParseError", () => {
    it("should create error with message and context", () => {
      const error = new URLParseError("Test error", { foo: "bar", num: 123 });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(URLParseError);
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("URLParseError");
      expect(error.context).toEqual({ foo: "bar", num: 123 });
    });

    it("should create error without context", () => {
      const error = new URLParseError("Simple error");

      expect(error.message).toBe("Simple error");
      expect(error.name).toBe("URLParseError");
      expect(error.context).toEqual({});
    });

    it("should create error with empty context", () => {
      const error = new URLParseError("Error with empty context", {});

      expect(error.context).toEqual({});
    });

    it("should preserve stack trace", () => {
      const error = new URLParseError("Test error");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("URLParseError");
    });

    it("should allow complex context objects", () => {
      const error = new URLParseError("Complex error", {
        actual: "posts",
        expected: "users",
        pathname: "/users/123",
        pattern: "/users/:id",
        position: 0,
        url: "https://example.com/users/123",
      });

      expect(error.context).toEqual({
        actual: "posts",
        expected: "users",
        pathname: "/users/123",
        pattern: "/users/:id",
        position: 0,
        url: "https://example.com/users/123",
      });
    });
  });
});
