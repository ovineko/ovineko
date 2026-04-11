import { describe, expect, it } from "vitest";

import { pluginScopes, pluginScopesName } from "./plugin.js";

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

  describe("resolveName", () => {
    it("returns name unchanged", () => {
      const plugin = pluginScopes();
      // resolveName is called with `this` context, but for testing we can call it directly
      const result = plugin.resolveName!.call({} as never, "getUserScopes", "function");
      expect(result).toBe("getUserScopes");
    });
  });
});
