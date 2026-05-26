import type { Operation } from "@kubb/oas";

import { describe, expect, it } from "vitest";

import { generateSwrScopeCode } from "./swrScopeCodegen.js";

function mockOperation(
  method: string,
  securityWithTypes: unknown,
  operationPath = "/pets",
): Operation {
  return {
    getSecurityWithTypes: () => securityWithTypes,
    method,
    path: operationPath,
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
    it("generates single-param body for GET without path params", () => {
      const operation = mockOperation("GET", oauthScopes("pets:read"), "/pets");
      const result = generateSwrScopeCode(operation, "getListPetsScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("query");
      expect(result!.hasPathParams).toBe(false);
      expect(result!.scopeGetterName).toBe("getListPetsScopes");
      expect(result!.functionBody).toContain("const { hasAccess } = useScopes();");
      expect(result!.functionBody).toContain("const requiredScopes = getListPetsScopes();");
      expect(result!.functionBody).toContain(
        "const hasRequiredAccess = hasAccess(requiredScopes);",
      );
      expect(result!.functionBody).toContain("return originalHook({");
      expect(result!.functionBody).not.toContain("return originalHook(params, {");
      expect(result!.functionBody).toContain(
        "shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true),",
      );
    });

    it("generates two-param body for GET with path params", () => {
      const operation = mockOperation("GET", oauthScopes("pets:read"), "/pets/{petId}");
      const result = generateSwrScopeCode(operation, "getGetPetByIdScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("query");
      expect(result!.hasPathParams).toBe(true);
      expect(result!.functionBody).toContain("return originalHook(params, {");
      expect(result!.functionBody).toContain("...options,");
    });
  });

  describe("mutation hook generation (non-GET operations)", () => {
    it("generates single-param body for POST without path params", () => {
      const operation = mockOperation("POST", oauthScopes("pets:write"), "/pets");
      const result = generateSwrScopeCode(operation, "getCreatePetScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("mutation");
      expect(result!.hasPathParams).toBe(false);
      expect(result!.scopeGetterName).toBe("getCreatePetScopes");
      expect(result!.functionBody).toContain("return originalHook({");
      expect(result!.functionBody).not.toContain("return originalHook(params, {");
    });

    it("generates two-param body for PUT with path params", () => {
      const operation = mockOperation("PUT", oauthScopes("pets:write"), "/pets/{petId}");
      const result = generateSwrScopeCode(operation, "getUpdatePetScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("mutation");
      expect(result!.hasPathParams).toBe(true);
      expect(result!.functionBody).toContain("return originalHook(params, {");
    });

    it("generates single-param body for DELETE without path params", () => {
      const operation = mockOperation("DELETE", oauthScopes("pets:delete"), "/pets");
      const result = generateSwrScopeCode(operation, "getDeletePetScopes");

      expect(result).not.toBeNull();
      expect(result!.hookType).toBe("mutation");
      expect(result!.hasPathParams).toBe(false);
      expect(result!.functionBody).toContain("return originalHook({");
    });

    it("generates mutation hook body for PATCH", () => {
      const operation = mockOperation("PATCH", oauthScopes("pets:write"), "/pets");
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
