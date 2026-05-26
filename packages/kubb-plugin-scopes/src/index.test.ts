import { describe, expect, it } from "vitest";

import { extractScopes, pluginScopes, pluginScopesName, scopesGenerator } from "./index.js";

describe("kubb-plugin-scopes index exports", () => {
  it("exports pluginScopes factory", () => {
    expect(pluginScopes).toBeTypeOf("function");
  });

  it("exports pluginScopesName constant", () => {
    expect(pluginScopesName).toBe("plugin-scopes");
  });

  it("exports scopesGenerator", () => {
    expect(scopesGenerator).toBeDefined();
    expect(scopesGenerator.name).toBe("plugin-scopes");
  });

  it("exports extractScopes function", () => {
    expect(extractScopes).toBeTypeOf("function");
  });
});
