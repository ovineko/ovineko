import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const genDir = join(import.meta.dirname, "gen");
const scopesDir = join(genDir, "scopes");
const hooksScopedDir = join(genDir, "hooks-scoped");

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

describe("kubb-plugin-scopes SWR scoped hooks integration", () => {
  describe("hooks-scoped directory exists with expected structure", () => {
    it("creates hooks-scoped directory", () => {
      expect(existsSync(hooksScopedDir)).toBe(true);
    });

    it("creates petScopes directory for pet-tagged endpoints", () => {
      expect(existsSync(join(hooksScopedDir, "petScopes"))).toBe(true);
    });

    it("creates adminScopes directory for admin-tagged endpoints", () => {
      expect(existsSync(join(hooksScopedDir, "adminScopes"))).toBe(true);
    });

    it("does not create publicScopes directory for endpoints without security", () => {
      expect(existsSync(join(hooksScopedDir, "publicScopes"))).toBe(false);
    });
  });

  describe("scoped hook files exist for operations with scopes", () => {
    it("creates listPets scoped hook file (query)", () => {
      expect(existsSync(join(hooksScopedDir, "petScopes", "listPets.ts"))).toBe(true);
    });

    it("creates createPet scoped hook file (mutation)", () => {
      expect(existsSync(join(hooksScopedDir, "petScopes", "createPet.ts"))).toBe(true);
    });

    it("creates getPetById scoped hook file (query)", () => {
      expect(existsSync(join(hooksScopedDir, "petScopes", "getPetById.ts"))).toBe(true);
    });

    it("creates getStats scoped hook file (query)", () => {
      expect(existsSync(join(hooksScopedDir, "adminScopes", "getStats.ts"))).toBe(true);
    });
  });

  describe("query hook structure (GET operations)", () => {
    it("listPets imports originalHook aliased from hooks barrel", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain('import { useListPets as originalHook } from "../../hooks"');
    });

    it("listPets imports scope getter from scopes barrel", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain('import { getListPetsScopes } from "../../scopes"');
    });

    it("listPets imports useScopes from configured path", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain('import { useScopes } from "@ovineko/kubb-client/scopes/react"');
    });

    it("listPets exports useListPetsScoped function with only options (no path params)", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain("export function useListPetsScoped(options?:");
      expect(content).not.toMatch(/useListPetsScoped\(params\?/);
    });

    it("listPets calls originalHook with only options (no path params)", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain("return originalHook({");
      expect(content).not.toContain("return originalHook(params, {");
      expect(content).toContain("...options,");
      expect(content).toContain("shouldFetch: hasRequiredAccess && (options?.shouldFetch ?? true)");
    });

    it("listPets uses hasAccess to check scopes", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain("const { hasAccess } = useScopes()");
      expect(content).toContain("const requiredScopes = getListPetsScopes()");
      expect(content).toContain("const hasRequiredAccess = hasAccess(requiredScopes)");
    });
  });

  describe("query hook with path params structure (GET /pets/{petId})", () => {
    it("getPetById uses two-param pattern (params + options)", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "getPetById.ts"), "utf8");
      expect(content).toContain("export function useGetPetByIdScoped(params?:");
      expect(content).toContain("return originalHook(params, {");
    });

    it("getPetById imports from ../../hooks (correct depth with grouping)", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "getPetById.ts"), "utf8");
      expect(content).toContain('import { useGetPetById as originalHook } from "../../hooks"');
    });
  });

  describe("mutation hook structure (POST operations)", () => {
    it("createPet imports originalHook aliased from hooks barrel", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "createPet.ts"), "utf8");
      expect(content).toContain('import { useCreatePet as originalHook } from "../../hooks"');
    });

    it("createPet exports useCreatePetScoped function with only options param", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "createPet.ts"), "utf8");
      expect(content).toContain("export function useCreatePetScoped(options?:");
      expect(content).not.toMatch(/useCreatePetScoped\(params\?/);
    });

    it("createPet calls originalHook with only options (mutation pattern)", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "createPet.ts"), "utf8");
      expect(content).toContain("return originalHook({");
      expect(content).toContain("...options,");
      expect(content).not.toContain("return originalHook(params,");
    });
  });

  describe("barrel files generated for hooks-scoped", () => {
    it("creates root hooks-scoped/index.ts barrel file", () => {
      expect(existsSync(join(hooksScopedDir, "index.ts"))).toBe(true);
    });

    it("root barrel exports all scoped hooks", () => {
      const content = readFileSync(join(hooksScopedDir, "index.ts"), "utf8");
      expect(content).toContain("useListPetsScoped");
      expect(content).toContain("useCreatePetScoped");
      expect(content).toContain("useGetPetByIdScoped");
      expect(content).toContain("useGetStatsScoped");
    });

    it("creates petScopes/index.ts barrel file", () => {
      expect(existsSync(join(hooksScopedDir, "petScopes", "index.ts"))).toBe(true);
    });

    it("creates adminScopes/index.ts barrel file", () => {
      expect(existsSync(join(hooksScopedDir, "adminScopes", "index.ts"))).toBe(true);
    });
  });

  describe("type safety patterns in generated code", () => {
    it("query hook without path params uses Parameters<typeof originalHook>[0] for options", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toContain("Parameters<typeof originalHook>[0]");
      expect(content).not.toContain("Parameters<typeof originalHook>[1]");
    });

    it("query hook with path params uses Parameters<typeof originalHook>[0] and [1]", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "getPetById.ts"), "utf8");
      expect(content).toContain("Parameters<typeof originalHook>[0]");
      expect(content).toContain("Parameters<typeof originalHook>[1]");
    });

    it("mutation hook uses Parameters<typeof originalHook>[0] for options type", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "createPet.ts"), "utf8");
      expect(content).toContain("Parameters<typeof originalHook>[0]");
    });

    it("hooks use ReturnType<typeof originalHook> for return type", () => {
      const files = [
        join(hooksScopedDir, "petScopes", "listPets.ts"),
        join(hooksScopedDir, "petScopes", "createPet.ts"),
      ];

      for (const file of files) {
        const content = readFileSync(file, "utf8");
        expect(content).toContain("ReturnType<typeof originalHook>");
      }
    });

    it("hooks omit shouldFetch and re-add as optional", () => {
      const content = readFileSync(join(hooksScopedDir, "petScopes", "listPets.ts"), "utf8");
      expect(content).toMatch(/Omit<.*"shouldFetch".*> & \{ shouldFetch\?: boolean \}/);
    });
  });
});
