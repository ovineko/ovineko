import { describe, expect, it } from "vitest";

import { scope } from "./types.js";
import { getMissingScopes, isAvailableScopes, normalizeScopes } from "./validation.js";

const read = scope("users:read");
const write = scope("users:write");
const admin = scope("admin");
const billing = scope("billing:manage");

describe("scopes/validation", () => {
  describe("normalizeScopes()", () => {
    it("returns empty array for empty input", () => {
      expect(normalizeScopes([])).toEqual([]);
    });

    it("wraps flat array into single AND group", () => {
      expect(normalizeScopes([read, write])).toEqual([[read, write]]);
    });

    it("passes nested array through unchanged", () => {
      const input = [[read, write], [admin]];
      expect(normalizeScopes(input)).toEqual([[read, write], [admin]]);
    });

    it("wraps single-element flat array", () => {
      expect(normalizeScopes([read])).toEqual([[read]]);
    });

    it("passes single-element nested array through", () => {
      expect(normalizeScopes([[read]])).toEqual([[read]]);
    });
  });

  describe("isAvailableScopes()", () => {
    it("returns true when no scopes required (empty array)", () => {
      expect(isAvailableScopes([], [])).toBe(true);
    });

    it("returns true when no scopes required (empty nested array)", () => {
      expect(isAvailableScopes([read], [])).toBe(true);
    });

    it("returns true for simple AND match (flat input)", () => {
      expect(isAvailableScopes([read, write], [read, write])).toBe(true);
    });

    it("returns false when missing a scope in AND group", () => {
      expect(isAvailableScopes([read], [read, write])).toBe(false);
    });

    it("returns true for OR-of-ANDs when first group matches", () => {
      expect(isAvailableScopes([read, write], [[read, write], [admin]])).toBe(true);
    });

    it("returns true for OR-of-ANDs when second group matches", () => {
      expect(isAvailableScopes([admin], [[read, write], [admin]])).toBe(true);
    });

    it("returns false for OR-of-ANDs when no group matches", () => {
      expect(isAvailableScopes([billing], [[read, write], [admin]])).toBe(false);
    });

    it("returns true when user has superset of required scopes", () => {
      expect(isAvailableScopes([read, write, admin], [read])).toBe(true);
    });

    it("returns false when user has no scopes but scopes are required", () => {
      expect(isAvailableScopes([], [read])).toBe(false);
    });

    it("handles single-element groups in OR-of-ANDs", () => {
      expect(isAvailableScopes([read], [[read], [admin]])).toBe(true);
    });
  });

  describe("getMissingScopes()", () => {
    it("returns empty array when no scopes required", () => {
      expect(getMissingScopes([], [])).toEqual([]);
    });

    it("returns empty array when requirements are satisfied", () => {
      expect(getMissingScopes([read, write], [read, write])).toEqual([]);
    });

    it("returns missing scopes for a flat requirement", () => {
      expect(getMissingScopes([read], [read, write])).toEqual([write]);
    });

    it("returns missing scopes from the best (least missing) AND group", () => {
      // Group 1: [read, write, admin] - missing write, admin (2 missing)
      // Group 2: [billing] - missing billing (1 missing)
      const result = getMissingScopes([read], [[read, write, admin], [billing]]);
      expect(result).toEqual([billing]);
    });

    it("returns empty array when any OR group is fully satisfied", () => {
      expect(getMissingScopes([admin], [[read, write], [admin]])).toEqual([]);
    });

    it("returns all scopes when user has nothing", () => {
      expect(getMissingScopes([], [read, write])).toEqual([read, write]);
    });

    it("returns missing from smallest group when all are fully missing", () => {
      // Group 1: [read, write] - 2 missing
      // Group 2: [admin] - 1 missing
      const result = getMissingScopes([], [[read, write], [admin]]);
      expect(result).toEqual([admin]);
    });

    it("handles single scope requirement", () => {
      expect(getMissingScopes([], [read])).toEqual([read]);
    });

    it("handles partial match across multiple groups", () => {
      // Group 1: [read, write] - missing write (1 missing)
      // Group 2: [admin, billing] - missing admin, billing (2 missing)
      const result = getMissingScopes(
        [read],
        [
          [read, write],
          [admin, billing],
        ],
      );
      expect(result).toEqual([write]);
    });
  });
});
