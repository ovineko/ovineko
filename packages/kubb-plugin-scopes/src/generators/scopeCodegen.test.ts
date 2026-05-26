import type { Operation } from "@kubb/oas";

import { describe, expect, it } from "vitest";

import { generateScopeCode } from "./scopeCodegen.js";

function mockOperation(securityWithTypes: unknown): Operation {
  return { getSecurityWithTypes: () => securityWithTypes } as unknown as Operation;
}

describe("generateScopeCode", () => {
  describe("returns null for operations without scopes", () => {
    it("returns null when no security schemes exist", () => {
      const operation = mockOperation([]);
      expect(generateScopeCode(operation, "@ovineko/kubb-client/scopes")).toBeNull();
    });

    it("returns null for API key only security", () => {
      const operation = mockOperation([[{ security: { _requirements: [] }, type: "apiKey" }]]);
      expect(generateScopeCode(operation, "@ovineko/kubb-client/scopes")).toBeNull();
    });
  });

  describe("returns code for operations with scopes", () => {
    it("generates code for single scope", () => {
      const operation = mockOperation([
        [{ security: { _requirements: ["users:read"] }, type: "OAuth2" }],
      ]);

      const result = generateScopeCode(operation, "@ovineko/kubb-client/scopes");

      expect(result).not.toBeNull();
      expect(result!.functionBody).toBe('return [scope("users:read")]');
      expect(result!.importPath).toBe("@ovineko/kubb-client/scopes");
    });

    it("generates code for multiple scopes", () => {
      const operation = mockOperation([
        [{ security: { _requirements: ["users:read", "users:write", "admin"] }, type: "OAuth2" }],
      ]);

      const result = generateScopeCode(operation, "@my-org/scopes");

      expect(result).not.toBeNull();
      expect(result!.functionBody).toBe(
        'return [scope("users:read"), scope("users:write"), scope("admin")]',
      );
      expect(result!.importPath).toBe("@my-org/scopes");
    });

    it("deduplicates scopes across multiple OR-groups", () => {
      const operation = mockOperation([
        [{ security: { _requirements: ["read", "write"] }, type: "OAuth2" }],
        [{ security: { _requirements: ["write", "admin"] }, type: "OAuth2" }],
      ]);

      const result = generateScopeCode(operation, "@ovineko/kubb-client/scopes");

      expect(result).not.toBeNull();
      expect(result!.functionBody).toBe('return [scope("read"), scope("write"), scope("admin")]');
    });

    it("handles OpenID Connect security type (mapped to OAuth2 by oas library)", () => {
      // The oas library maps openIdConnect to "OAuth2" type
      const operation = mockOperation([
        [{ security: { _requirements: ["openid", "profile"] }, type: "OAuth2" }],
      ]);

      const result = generateScopeCode(operation, "@ovineko/kubb-client/scopes");

      expect(result).not.toBeNull();
      expect(result!.functionBody).toBe('return [scope("openid"), scope("profile")]');
    });
  });

  describe("escapes special characters in scope strings", () => {
    it("escapes double quotes in scope names", () => {
      const operation = mockOperation([
        [{ security: { _requirements: ['read"admin'] }, type: "OAuth2" }],
      ]);

      const result = generateScopeCode(operation, "@ovineko/kubb-client/scopes");

      expect(result).not.toBeNull();
      expect(result!.functionBody).toBe('return [scope("read\\"admin")]');
    });

    it("escapes backslashes in scope names", () => {
      const operation = mockOperation([
        [{ security: { _requirements: ["read\\write"] }, type: "OAuth2" }],
      ]);

      const result = generateScopeCode(operation, "@ovineko/kubb-client/scopes");

      expect(result).not.toBeNull();
      expect(result!.functionBody).toBe('return [scope("read\\\\write")]');
    });
  });

  describe("import path passthrough", () => {
    it("uses provided import path in result", () => {
      const operation = mockOperation([
        [{ security: { _requirements: ["read"] }, type: "OAuth2" }],
      ]);

      const result = generateScopeCode(operation, "@custom/path");
      expect(result!.importPath).toBe("@custom/path");
    });
  });
});
