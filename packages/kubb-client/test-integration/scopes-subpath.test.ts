import {
  getMissingScopes,
  isAvailableScopes,
  normalizeScopes,
  scope,
} from "@ovineko/kubb-client/scopes";
import { describe, expect, it } from "vitest";

describe("@ovineko/kubb-client/scopes subpath export", () => {
  it("exports scope() helper", () => {
    const s = scope("users:read");
    expect(s).toBe("users:read");
  });

  it("exports normalizeScopes()", () => {
    const result = normalizeScopes([scope("a"), scope("b")]);
    expect(result).toEqual([[scope("a"), scope("b")]]);
  });

  it("exports isAvailableScopes()", () => {
    const available = isAvailableScopes([scope("a")], [scope("a")]);
    expect(available).toBe(true);
  });

  it("exports getMissingScopes()", () => {
    const missing = getMissingScopes([scope("a")], [scope("a"), scope("b")]);
    expect(missing).toEqual([scope("b")]);
  });
});
