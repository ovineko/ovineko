import { describe, expect, it } from "vitest";

import { swrScopesGenerator } from "./swrScopes.js";

describe("swrScopesGenerator", () => {
  describe("structure", () => {
    it("has name 'plugin-scopes-swr'", () => {
      expect(swrScopesGenerator.name).toBe("plugin-scopes-swr");
    });

    it("has type 'react'", () => {
      expect(swrScopesGenerator.type).toBe("react");
    });

    it("has version '1'", () => {
      expect(swrScopesGenerator.version).toBe("1");
    });

    it("has Operation hook defined", () => {
      expect(swrScopesGenerator.Operation).toBeTypeOf("function");
    });
  });
});
