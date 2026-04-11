import { RequireScopes, scope, ScopesProvider, useScopes } from "@ovineko/kubb-client/scopes/react";
import { describe, expect, it } from "vitest";

describe("@ovineko/kubb-client/scopes/react subpath export", () => {
  it("exports scope() helper", () => {
    expect(typeof scope).toBe("function");
  });

  it("exports ScopesProvider component", () => {
    expect(typeof ScopesProvider).toBe("function");
  });

  it("exports RequireScopes component", () => {
    expect(typeof RequireScopes).toBe("function");
  });

  it("exports useScopes hook", () => {
    expect(typeof useScopes).toBe("function");
  });
});
