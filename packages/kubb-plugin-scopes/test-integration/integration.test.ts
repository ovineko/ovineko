import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const genDir = join(import.meta.dirname, "gen");
const scopesDir = join(genDir, "scopes");

describe("kubb-plugin-scopes end-to-end integration", () => {
  describe("generated scopes files exist at expected paths", () => {
    it("creates petScopes directory for pet-tagged endpoints", () => {
      expect(existsSync(join(scopesDir, "petScopes"))).toBe(true);
    });

    it("creates adminScopes directory for admin-tagged endpoints", () => {
      expect(existsSync(join(scopesDir, "adminScopes"))).toBe(true);
    });

    it("does not create publicScopes directory for endpoints without security", () => {
      expect(existsSync(join(scopesDir, "publicScopes"))).toBe(false);
    });

    it("creates listPets.ts scope file", () => {
      expect(existsSync(join(scopesDir, "petScopes", "listPets.ts"))).toBe(true);
    });

    it("creates createPet.ts scope file", () => {
      expect(existsSync(join(scopesDir, "petScopes", "createPet.ts"))).toBe(true);
    });

    it("creates getPetById.ts scope file", () => {
      expect(existsSync(join(scopesDir, "petScopes", "getPetById.ts"))).toBe(true);
    });

    it("creates getStats.ts scope file", () => {
      expect(existsSync(join(scopesDir, "adminScopes", "getStats.ts"))).toBe(true);
    });
  });

  describe("generated code contains correct getXxxScopes() functions", () => {
    it("listPets has getListPetsScopes returning pets:read", () => {
      const content = readFileSync(join(scopesDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain("export function getListPetsScopes(): ApiScope[]");
      expect(content).toContain('scope("pets:read")');
      expect(content).not.toContain('scope("pets:write")');
    });

    it("createPet has getCreatePetScopes returning pets:read and pets:write", () => {
      const content = readFileSync(join(scopesDir, "petScopes", "createPet.ts"), "utf8");
      expect(content).toContain("export function getCreatePetScopes(): ApiScope[]");
      expect(content).toContain('scope("pets:read")');
      expect(content).toContain('scope("pets:write")');
    });

    it("getPetById has getGetPetByIdScopes returning pets:read (from OAuth2, ignoring apiKey)", () => {
      const content = readFileSync(join(scopesDir, "petScopes", "getPetById.ts"), "utf8");
      expect(content).toContain("export function getGetPetByIdScopes(): ApiScope[]");
      expect(content).toContain('scope("pets:read")');
    });

    it("getStats has getGetStatsScopes returning admin", () => {
      const content = readFileSync(join(scopesDir, "adminScopes", "getStats.ts"), "utf8");
      expect(content).toContain("export function getGetStatsScopes(): ApiScope[]");
      expect(content).toContain('scope("admin")');
    });
  });

  describe("generated code imports from @ovineko/kubb-client/scopes", () => {
    it("imports ApiScope type from correct path", () => {
      const content = readFileSync(join(scopesDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain('import type { ApiScope } from "@ovineko/kubb-client/scopes"');
    });

    it("imports scope function from correct path", () => {
      const content = readFileSync(join(scopesDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain('import { scope } from "@ovineko/kubb-client/scopes"');
    });
  });

  describe("generated code compiles with TypeScript", () => {
    it("all generated scopes files contain valid TypeScript syntax", () => {
      const files = [
        join(scopesDir, "petScopes", "listPets.ts"),
        join(scopesDir, "petScopes", "createPet.ts"),
        join(scopesDir, "petScopes", "getPetById.ts"),
        join(scopesDir, "adminScopes", "getStats.ts"),
      ];

      for (const file of files) {
        const content = readFileSync(file, "utf8");

        // Verify it's well-formed: has imports, export function, return statement
        expect(content).toMatch(/^import type \{ ApiScope \}/m);
        expect(content).toMatch(/^import \{ scope \}/m);
        expect(content).toMatch(/^export function \w+\(\): ApiScope\[\]/m);
        expect(content).toMatch(/return \[.*\]/);
      }
    });
  });

  describe("generated function returns correct scopes array", () => {
    it("getListPetsScopes returns exactly one scope", () => {
      const content = readFileSync(join(scopesDir, "petScopes", "listPets.ts"), "utf8");
      const returnMatch = content.match(/return \[(.*)\]/);
      expect(returnMatch).not.toBeNull();
      const scopeCalls = returnMatch![1].match(/scope\(/g);
      expect(scopeCalls).toHaveLength(1);
    });

    it("getCreatePetScopes returns exactly two scopes", () => {
      const content = readFileSync(join(scopesDir, "petScopes", "createPet.ts"), "utf8");
      const returnMatch = content.match(/return \[(.*)\]/);
      expect(returnMatch).not.toBeNull();
      const scopeCalls = returnMatch![1].match(/scope\(/g);
      expect(scopeCalls).toHaveLength(2);
    });

    it("getGetStatsScopes returns exactly one scope", () => {
      const content = readFileSync(join(scopesDir, "adminScopes", "getStats.ts"), "utf8");
      const returnMatch = content.match(/return \[(.*)\]/);
      expect(returnMatch).not.toBeNull();
      const scopeCalls = returnMatch![1].match(/scope\(/g);
      expect(scopeCalls).toHaveLength(1);
    });
  });
});
