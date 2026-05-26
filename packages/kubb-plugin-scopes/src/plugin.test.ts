import type * as kubbCore from "@kubb/core";

import { getMode } from "@kubb/core";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { pluginScopes, pluginScopesName } from "./plugin.js";

function mockContext(root = "/project", outputPath = "gen") {
  return {
    config: {
      output: { path: outputPath },
      root,
    },
  };
}

// Mock getMode to control return value for resolvePath tests
vi.mock("@kubb/core", async () => {
  const original = await vi.importActual<typeof kubbCore>("@kubb/core");
  return {
    ...original,
    getMode: vi.fn().mockReturnValue("split"),
  };
});

describe("pluginScopes", () => {
  describe("plugin name", () => {
    it("has name constant 'plugin-scopes'", () => {
      expect(pluginScopesName).toBe("plugin-scopes");
    });

    it("creates plugin with correct name", () => {
      const plugin = pluginScopes();
      expect(plugin.name).toBe("plugin-scopes");
    });
  });

  describe("plugin creation with minimal options", () => {
    it("creates plugin instance without options", () => {
      const plugin = pluginScopes();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe("plugin-scopes");
    });

    it("sets default output path", () => {
      const plugin = pluginScopes();
      expect(plugin.options.output.path).toBe("scopes");
    });

    it("sets default barrel type", () => {
      const plugin = pluginScopes();
      expect(plugin.options.output.barrelType).toBe("named");
    });

    it("sets default import path", () => {
      const plugin = pluginScopes();
      expect(plugin.options.importPath).toBe("@ovineko/kubb-client/scopes");
    });

    it("sets group to undefined by default", () => {
      const plugin = pluginScopes();
      expect(plugin.options.group).toBeUndefined();
    });

    it("sets generateSwrWrappers to false by default", () => {
      const plugin = pluginScopes();
      expect(plugin.options.generateSwrWrappers).toBe(false);
    });

    it("sets default scopesReactImportPath", () => {
      const plugin = pluginScopes();
      expect(plugin.options.scopesReactImportPath).toBe("@ovineko/kubb-client/scopes/react");
    });

    it("sets default swrWrappersOutputPath", () => {
      const plugin = pluginScopes();
      expect(plugin.options.swrWrappersOutputPath).toBe("hooks-scoped");
    });
  });

  describe("plugin creation with custom options", () => {
    it("accepts custom output path", () => {
      const plugin = pluginScopes({
        output: { path: "./custom-scopes" },
      });
      expect(plugin.options.output.path).toBe("./custom-scopes");
    });

    it("accepts custom import path", () => {
      const plugin = pluginScopes({
        importPath: "@my-org/scopes-lib",
      });
      expect(plugin.options.importPath).toBe("@my-org/scopes-lib");
    });

    it("accepts group configuration", () => {
      const plugin = pluginScopes({
        group: { type: "tag" },
      });
      expect(plugin.options.group).toEqual({ type: "tag" });
    });

    it("accepts group with custom name function", () => {
      const plugin = pluginScopes({
        group: { name: (ctx) => `${ctx.group}Scopes`, type: "tag" },
      });
      expect(plugin.options.group?.name).toBeTypeOf("function");
      expect(plugin.options.group?.name?.({ group: "pet" })).toBe("petScopes");
    });

    it("accepts generateSwrWrappers option", () => {
      const plugin = pluginScopes({ generateSwrWrappers: true });
      expect(plugin.options.generateSwrWrappers).toBe(true);
    });

    it("accepts custom scopesReactImportPath", () => {
      const plugin = pluginScopes({ scopesReactImportPath: "@my-org/scopes/react" });
      expect(plugin.options.scopesReactImportPath).toBe("@my-org/scopes/react");
    });

    it("accepts custom swrWrappersOutputPath", () => {
      const plugin = pluginScopes({ swrWrappersOutputPath: "custom-hooks-scoped" });
      expect(plugin.options.swrWrappersOutputPath).toBe("custom-hooks-scoped");
    });
  });

  describe("plugin pre-dependencies", () => {
    it("declares plugin-oas as prerequisite", () => {
      const plugin = pluginScopes();
      expect(plugin.pre).toContain("plugin-oas");
    });
  });

  describe("lifecycle hooks", () => {
    it("has install hook defined", () => {
      const plugin = pluginScopes();
      expect(plugin.install).toBeTypeOf("function");
    });

    it("has resolvePath hook defined", () => {
      const plugin = pluginScopes();
      expect(plugin.resolvePath).toBeTypeOf("function");
    });

    it("has resolveName hook defined", () => {
      const plugin = pluginScopes();
      expect(plugin.resolveName).toBeTypeOf("function");
    });
  });

  describe("resolveName (camelCase conversion)", () => {
    it("returns simple camelCase name unchanged", () => {
      const plugin = pluginScopes();
      const result = plugin.resolveName!.call({} as never, "getUserScopes", "function");
      expect(result).toBe("getUserScopes");
    });

    it("converts kebab-case to camelCase", () => {
      const plugin = pluginScopes();
      const result = plugin.resolveName!.call({} as never, "get-user-scopes", "function");
      expect(result).toBe("getUserScopes");
    });

    it("converts snake_case to camelCase", () => {
      const plugin = pluginScopes();
      const result = plugin.resolveName!.call({} as never, "get_user_scopes", "function");
      expect(result).toBe("getUserScopes");
    });

    it("converts PascalCase to camelCase", () => {
      const plugin = pluginScopes();
      const result = plugin.resolveName!.call({} as never, "GetUserScopes", "function");
      expect(result).toBe("getUserScopes");
    });

    it("handles single word name", () => {
      const plugin = pluginScopes();
      const result = plugin.resolveName!.call({} as never, "scopes", "function");
      expect(result).toBe("scopes");
    });

    it("returns same result for file type as for function type", () => {
      const plugin = pluginScopes();
      const fnResult = plugin.resolveName!.call({} as never, "get-user", "function");
      const fileResult = plugin.resolveName!.call({} as never, "get-user", "file");
      expect(fnResult).toBe(fileResult);
    });

    it("handles names with multiple consecutive separators", () => {
      const plugin = pluginScopes();
      const result = plugin.resolveName!.call({} as never, "get--user", "function");
      expect(result).toBe("getUser");
    });
  });

  describe("resolvePath", () => {
    it("resolves path in split mode without group", () => {
      const plugin = pluginScopes();
      vi.mocked(getMode).mockReturnValue("split");

      const ctx = mockContext();
      const result = plugin.resolvePath!.call(ctx as never, "getUserScopes.ts", undefined, {});
      expect(result).toBe(path.resolve("/project", "gen", "scopes", "getUserScopes.ts"));
    });

    it("resolves path in single mode", () => {
      const plugin = pluginScopes({ output: { path: "scopes.ts" } });
      vi.mocked(getMode).mockReturnValue("single");

      const ctx = mockContext();
      const result = plugin.resolvePath!.call(ctx as never, "getUserScopes.ts", "single", {});
      expect(result).toBe(path.resolve("/project", "gen", "scopes.ts"));
    });

    it("resolves path with pathMode override to single", () => {
      const plugin = pluginScopes({ output: { path: "all-scopes.ts" } });

      const ctx = mockContext();
      const result = plugin.resolvePath!.call(ctx as never, "getUserScopes.ts", "single", {});
      expect(result).toBe(path.resolve("/project", "gen", "all-scopes.ts"));
    });

    it("resolves path with group tag", () => {
      const plugin = pluginScopes({
        group: { type: "tag" },
      });
      vi.mocked(getMode).mockReturnValue("split");

      const ctx = mockContext();
      const result = plugin.resolvePath!.call(ctx as never, "getUserScopes.ts", undefined, {
        group: { tag: "pets" },
      });
      expect(result).toBe(path.resolve("/project", "gen", "scopes", "pets", "getUserScopes.ts"));
    });

    it("resolves path with group tag and custom name function", () => {
      const plugin = pluginScopes({
        group: { name: (ctx) => `${ctx.group}Api`, type: "tag" },
      });
      vi.mocked(getMode).mockReturnValue("split");

      const ctx = mockContext();
      const result = plugin.resolvePath!.call(ctx as never, "getUserScopes.ts", undefined, {
        group: { tag: "pets" },
      });
      expect(result).toBe(path.resolve("/project", "gen", "scopes", "petsApi", "getUserScopes.ts"));
    });

    it("resolves path without group tag in options (no grouping)", () => {
      const plugin = pluginScopes({
        group: { type: "tag" },
      });
      vi.mocked(getMode).mockReturnValue("split");

      const ctx = mockContext();
      const result = plugin.resolvePath!.call(ctx as never, "getUserScopes.ts", undefined, {});
      expect(result).toBe(path.resolve("/project", "gen", "scopes", "getUserScopes.ts"));
    });

    it("uses getMode fallback when pathMode is undefined", () => {
      const plugin = pluginScopes({ output: { path: "scopes.ts" } });
      vi.mocked(getMode).mockReturnValue("single");

      const ctx = mockContext();
      const result = plugin.resolvePath!.call(ctx as never, "getUserScopes.ts", undefined, {});
      // getMode returns "single", so it should return the output.path directly
      expect(result).toBe(path.resolve("/project", "gen", "scopes.ts"));
    });

    it("resolves path with custom root and output", () => {
      const plugin = pluginScopes({ output: { path: "api/scopes" } });
      vi.mocked(getMode).mockReturnValue("split");

      const ctx = mockContext("/custom/root", "output");
      const result = plugin.resolvePath!.call(ctx as never, "file.ts", undefined, {});
      expect(result).toBe(path.resolve("/custom/root", "output", "api/scopes", "file.ts"));
    });

    it("resolves group with default name function when group.name is undefined", () => {
      const plugin = pluginScopes({
        group: { type: "tag" },
      });
      vi.mocked(getMode).mockReturnValue("split");

      const ctx = mockContext();
      // When group.name is undefined, the default (ctx) => ctx.group is used
      const result = plugin.resolvePath!.call(ctx as never, "file.ts", undefined, {
        group: { tag: "users" },
      });
      expect(result).toBe(path.resolve("/project", "gen", "scopes", "users", "file.ts"));
    });
  });
});
