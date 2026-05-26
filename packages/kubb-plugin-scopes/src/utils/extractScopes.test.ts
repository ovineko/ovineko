import type { Operation } from "@kubb/oas";

import { describe, expect, it } from "vitest";

import { extractScopes } from "./extractScopes.js";

/**
 * Creates a minimal mock Operation with the given getSecurityWithTypes return value.
 */
function mockOperation(
  securityWithTypes: ReturnType<Operation["getSecurityWithTypes"]>,
): Operation {
  return {
    getSecurityWithTypes: () => securityWithTypes,
  } as unknown as Operation;
}

describe("extractScopes", () => {
  it("returns empty array when operation has no security schemes", () => {
    const operation = mockOperation([]);
    expect(extractScopes(operation)).toEqual([]);
  });

  it("returns empty array when all security groups are invalid (false)", () => {
    const operation = mockOperation([false, false]);
    expect(extractScopes(operation)).toEqual([]);
  });

  it("returns empty array when security scheme has no scopes (e.g. API key)", () => {
    const operation = mockOperation([
      [
        {
          security: {
            _key: "apiKey",
            in: "header",
            name: "X-API-Key",
            type: "apiKey",
          },
          type: "apiKey" as const,
        },
      ],
    ]);
    expect(extractScopes(operation)).toEqual([]);
  });

  it("extracts scopes from OAuth2 security scheme", () => {
    const operation = mockOperation([
      [
        {
          security: {
            _key: "oauth2",
            _requirements: ["users:read", "users:write"],
            flows: {},
            type: "oauth2",
          },
          type: "OAuth2" as const,
        },
      ],
    ]);
    expect(extractScopes(operation)).toEqual(["users:read", "users:write"]);
  });

  it("extracts scopes from OpenID Connect security scheme (mapped as OAuth2)", () => {
    const operation = mockOperation([
      [
        {
          security: {
            _key: "oidc",
            _requirements: ["profile", "email"],
            openIdConnectUrl: "https://example.com/.well-known",
            type: "openIdConnect",
          },
          type: "OAuth2" as const,
        },
      ],
    ]);
    expect(extractScopes(operation)).toEqual(["profile", "email"]);
  });

  it("extracts scopes from mixed security schemes (OAuth2 + API key)", () => {
    const operation = mockOperation([
      [
        {
          security: {
            _key: "oauth2",
            _requirements: ["admin:read"],
            flows: {},
            type: "oauth2",
          },
          type: "OAuth2" as const,
        },
        {
          security: {
            _key: "apiKey",
            in: "header",
            name: "X-API-Key",
            type: "apiKey",
          },
          type: "apiKey" as const,
        },
      ],
    ]);
    expect(extractScopes(operation)).toEqual(["admin:read"]);
  });

  it("deduplicates scopes across multiple OR-groups", () => {
    const operation = mockOperation([
      [
        {
          security: {
            _key: "oauth2_a",
            _requirements: ["users:read", "users:write"],
            flows: {},
            type: "oauth2",
          },
          type: "OAuth2" as const,
        },
      ],
      [
        {
          security: {
            _key: "oauth2_b",
            _requirements: ["users:read", "admin:read"],
            flows: {},
            type: "oauth2",
          },
          type: "OAuth2" as const,
        },
      ],
    ]);
    const scopes = extractScopes(operation);
    expect(scopes).toHaveLength(3);
    expect(new Set(scopes)).toEqual(new Set(["admin:read", "users:read", "users:write"]));
  });

  it("handles OAuth2 scheme with empty _requirements array", () => {
    const operation = mockOperation([
      [
        {
          security: {
            _key: "oauth2",
            _requirements: [],
            flows: {},
            type: "oauth2",
          },
          type: "OAuth2" as const,
        },
      ],
    ]);
    expect(extractScopes(operation)).toEqual([]);
  });

  it("handles OAuth2 scheme without _requirements field", () => {
    const operation = mockOperation([
      [
        {
          security: {
            _key: "oauth2",
            flows: {},
            type: "oauth2",
          },
          type: "OAuth2" as const,
        },
      ],
    ]);
    expect(extractScopes(operation)).toEqual([]);
  });

  it("skips false entries within an OR-group (invalid scheme references)", () => {
    const operation = mockOperation([
      [
        false,
        {
          security: {
            _key: "oauth2",
            _requirements: ["scope:a"],
            flows: {},
            type: "oauth2",
          },
          type: "OAuth2" as const,
        },
      ],
    ]);
    expect(extractScopes(operation)).toEqual(["scope:a"]);
  });
});
