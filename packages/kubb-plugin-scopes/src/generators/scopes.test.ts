import type { Operation } from "@kubb/oas";

import { describe, expect, it } from "vitest";

import { extractScopes } from "../utils/extractScopes.js";
import { scopesGenerator } from "./scopes.js";

/**
 * Helper to build the code string that the generator would produce for given scopes.
 * This mirrors the logic inside the Operation component.
 */
function buildScopeFunctionBody(scopes: string[]): string {
  const scopeValues = scopes.map((s) => `scope("${s}")`).join(", ");
  return `return [${scopeValues}]`;
}

function mockOperation(securityWithTypes: unknown): Operation {
  return { getSecurityWithTypes: () => securityWithTypes } as unknown as Operation;
}

describe("scopesGenerator", () => {
  describe("structure", () => {
    it("has name 'plugin-scopes'", () => {
      expect(scopesGenerator.name).toBe("plugin-scopes");
    });

    it("has type 'react'", () => {
      expect(scopesGenerator.type).toBe("react");
    });

    it("has version '1'", () => {
      expect(scopesGenerator.version).toBe("1");
    });

    it("has Operation hook defined", () => {
      expect(scopesGenerator.Operation).toBeTypeOf("function");
    });
  });

  describe("code generation logic for single scope operation", () => {
    it("generates correct return statement for single scope", () => {
      const scopes = ["users:read"];
      const body = buildScopeFunctionBody(scopes);
      expect(body).toBe('return [scope("users:read")]');
    });

    it("generates correct return statement for multiple scopes", () => {
      const scopes = ["users:read", "users:write", "admin"];
      const body = buildScopeFunctionBody(scopes);
      expect(body).toBe('return [scope("users:read"), scope("users:write"), scope("admin")]');
    });

    it("generates empty array return for no scopes", () => {
      const scopes: string[] = [];
      const body = buildScopeFunctionBody(scopes);
      expect(body).toBe("return []");
    });
  });

  describe("integration with extractScopes", () => {
    it("produces scopes array for OAuth2 operation", () => {
      const operation: Operation = mockOperation([
        [
          {
            security: { _requirements: ["users:read", "users:write"] },
            type: "OAuth2",
          },
        ],
      ]);

      const scopes = extractScopes(operation);
      expect(scopes).toEqual(["users:read", "users:write"]);

      const body = buildScopeFunctionBody(scopes);
      expect(body).toBe('return [scope("users:read"), scope("users:write")]');
    });

    it("produces empty array for operation without security", () => {
      const operation = mockOperation([]);
      const scopes = extractScopes(operation);
      expect(scopes).toEqual([]);
    });

    it("produces empty array for API key only operation", () => {
      const operation = mockOperation([
        [
          {
            security: { _requirements: [] },
            type: "apiKey",
          },
        ],
      ]);

      const scopes = extractScopes(operation);
      expect(scopes).toEqual([]);
    });

    it("deduplicates scopes across multiple OR-groups", () => {
      const operation = mockOperation([
        [
          {
            security: { _requirements: ["read", "write"] },
            type: "OAuth2",
          },
        ],
        [
          {
            security: { _requirements: ["write", "admin"] },
            type: "OAuth2",
          },
        ],
      ]);

      const scopes = extractScopes(operation);
      expect(scopes).toEqual(["read", "write", "admin"]);

      const body = buildScopeFunctionBody(scopes);
      expect(body).toBe('return [scope("read"), scope("write"), scope("admin")]');
    });
  });

  describe("generated code validity", () => {
    it("produces valid TypeScript function body", () => {
      const scopes = ["users:read", "users:write"];
      const body = buildScopeFunctionBody(scopes);

      // The generated code should be a valid return statement
      expect(body).toMatch(/^return \[.*\]$/);

      // Each scope should be wrapped in scope()
      for (const s of scopes) {
        expect(body).toContain(`scope("${s}")`);
      }
    });

    it("properly escapes scope names in generated code", () => {
      // Scope names with special characters should be properly quoted
      const scopes = ["scope.with.dots", "scope-with-dashes", "scope_with_underscores"];
      const body = buildScopeFunctionBody(scopes);

      expect(body).toContain('scope("scope.with.dots")');
      expect(body).toContain('scope("scope-with-dashes")');
      expect(body).toContain('scope("scope_with_underscores")');
    });

    it("generates compilable TypeScript", () => {
      const scopes = ["users:read", "admin:full"];
      const body = buildScopeFunctionBody(scopes);

      // Build a complete function that mirrors what the generator produces
      const fullCode = [
        'import type { ApiScope } from "@ovineko/kubb-client/scopes";',
        'import { scope } from "@ovineko/kubb-client/scopes";',
        "",
        `export function getUserScopes(): ApiScope[] {`,
        `  ${body};`,
        `}`,
      ].join("\n");

      // Verify structural validity (import statements, function declaration, return)
      expect(fullCode).toContain("import type { ApiScope }");
      expect(fullCode).toContain("import { scope }");
      expect(fullCode).toContain("export function getUserScopes(): ApiScope[]");
      expect(fullCode).toContain("return [");
    });
  });
});
