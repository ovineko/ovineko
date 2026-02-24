import { describe, expect, it } from "vitest";

import { name } from "../../package.json";
import plugin, { configs, rules } from "./index";

const expectedPluginName = name;

describe("eslint plugin", () => {
  it("exports rules for both lint rules", () => {
    expect(rules).toHaveProperty("no-direct-error-boundary");
    expect(rules).toHaveProperty("no-direct-lazy");
  });

  it("default export includes rules and configs", () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBeDefined();
  });

  it("plugin name is @ovineko/spa-guard-eslint", () => {
    const recommended = configs.recommended as Record<string, unknown>;
    const plugins = recommended.plugins as Record<string, unknown>;
    expect(plugins).toHaveProperty("@ovineko/spa-guard-eslint");
  });

  it("recommended config uses dynamic plugin name as key", () => {
    const recommended = configs.recommended as Record<string, unknown>;
    expect(recommended).toBeDefined();

    const plugins = recommended.plugins as Record<string, unknown>;
    expect(plugins).toHaveProperty(expectedPluginName);
    expect(plugins[expectedPluginName]).toBe(plugin);
  });

  it("recommended config rule keys use dynamic plugin name prefix", () => {
    const recommended = configs.recommended as Record<string, unknown>;
    const configRules = recommended.rules as Record<string, string>;

    expect(configRules[`${expectedPluginName}/no-direct-error-boundary`]).toBe("error");
    expect(configRules[`${expectedPluginName}/no-direct-lazy`]).toBe("error");
    expect(Object.keys(configRules)).toHaveLength(2);
  });

  it("named export configs is the same reference as plugin.configs", () => {
    expect(configs).toBe(plugin.configs);
  });
});
