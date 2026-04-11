import type { Operation } from "@kubb/oas";

import { describe, expect, it } from "vitest";

import { generateSwrScopeCode } from "./swrScopeCodegen.js";

function mockOperation(method: string, securityWithTypes: unknown): Operation {
  return {
    getSecurityWithTypes: () => securityWithTypes,
    method,
  } as unknown as Operation;
}

function oauthScopes(...scopes: string[]) {
  return [[{ security: { _requirements: scopes }, type: "OAuth2" }]];
}

describe("generateSwrScopeCode", () => {
  describe("returns null for operations without scopes", () => {
    it("returns null when no security schemes exist", () => {
      const operation = mockOperation("GET", []);
      expect(generateSwrScopeCode(operation, "getListPetsScopes")).toBeNull();
    });

    it("returns null for API key only security", () => {
      const operation = mockOperation("POST", [
        [{ security: { _requirements: [] }, type: "apiKey" }],
      ]);
      expect(generateSwrScopeCode(operation, "getCreatePetScopes")).toBeNull();
    });
  });

  describe("query hook generation (GET operations)", () => {
    it("generates query hook body with scopes", () => {
      const operation = mockOperation("GET", oauthScopes("pets:read"));
      const result = generateSwrScopeCode(operation, "getListPetsScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("query");
      expect(result!.scopeGetterName).toBe("getListPetsScopes");
      expect(result!.functionBody).toContain("const { hasAccess } = useScopes();");
      expect(result!.functionBody).toContain("const requiredScopes = getListPetsScopes();");
      expect(result!.functionBody).toContain(
        "const hasRequiredAccess = hasAccess(requiredScopes);",
      );
      expect(result!.functionBody).toContain("return originalHook(params, {");
      expect(result!.functionBody).toContain("...options,");
      expect(result!.functionBody).toContain(
        "shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
      );
    });
  });

  describe("mutation hook generation (non-GET operations)", () => {
    it("generates mutation hook body for POST", () => {
      const operation = mockOperation("POST", oauthScopes("pets:write"));
      const result = generateSwrScopeCode(operation, "getCreatePetScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("mutation");
      expect(result!.scopeGetterName).toBe("getCreatePetScopes");
      expect(result!.functionBody).toContain("return originalHook({");
      expect(result!.functionBody).not.toContain("return originalHook(params, {");
    });

    it("generates mutation hook body for PUT", () => {
      const operation = mockOperation("PUT", oauthScopes("pets:write"));
      const result = generateSwrScopeCode(operation, "getUpdatePetScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("mutation");
      expect(result!.functionBody).toContain("return originalHook({");
    });

    it("generates mutation hook body for DELETE", () => {
      const operation = mockOperation("DELETE", oauthScopes("pets:delete"));
      const result = generateSwrScopeCode(operation, "getDeletePetScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("mutation");
      expect(result!.functionBody).toContain("return originalHook({");
    });

    it("generates mutation hook body for PATCH", () => {
      const operation = mockOperation("PATCH", oauthScopes("pets:write"));
      const result = generateSwrScopeCode(operation, "getPatchPetScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("mutation");
    });
  });

  describe("common structure", () => {
    it("always includes useScopes and hasAccess logic", () => {
      const operation = mockOperation("GET", oauthScopes("read"));
      const result = generateSwrScopeCode(operation, "getReadScopes");

      expect(result!.functionBody).toContain("const { hasAccess } = useScopes();");
      expect(result!.functionBody).toContain(
        "const hasRequiredAccess = hasAccess(requiredScopes);",
      );
    });

    it("always includes shouldFetch gating", () => {
      const operation = mockOperation("POST", oauthScopes("write"));
      const result = generateSwrScopeCode(operation, "getWriteScopes");

      expect(result!.functionBody).toContain(
        "shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
      );
    });
  });
});
