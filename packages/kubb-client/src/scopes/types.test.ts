import { describe, expect, it } from "vitest";

import type { ApiScope } from "./types.js";

import { scope } from "./types.js";

describe("scopes/types", () => {
  describe("scope()", () => {
    it("creates an ApiScope from a string", () => {
      const s = scope("users:read");
      expect(s).toBe("users:read");
    });

    it("returns value usable as a string", () => {
      const s = scope("admin:write");
      const str: string = s;
      expect(str).toBe("admin:write");
    });

    it("creates distinct scope values", () => {
      const a = scope("users:read");
      const b = scope("users:write");
      expect(a).not.toBe(b);
    });

    it("creates equal scopes from same string", () => {
      const a = scope("users:read");
      const b = scope("users:read");
      expect(a).toBe(b);
    });

    it("works with empty string", () => {
      const s = scope("");
      expect(s).toBe("");
    });
  });

  describe("ApiScope type branding", () => {
    it("scope values can be used in arrays", () => {
      const scopes: ApiScope[] = [scope("a"), scope("b")];
      expect(scopes).toHaveLength(2);
    });

    it("scope values work with Set", () => {
      const set = new Set<ApiScope>([scope("a"), scope("a"), scope("b")]);
      expect(set.size).toBe(2);
    });
  });
});
