import type { PluginConfig } from "@docusaurus/types";

import { describe, expect, it } from "vitest";

import { appendArray, appendPlugins, getPluginIdentity } from "./merge.js";

function myPlugin() {}
const fn1 = () => {};
const fn2 = () => {};

describe("appendArray", () => {
  it("returns existing when toAdd is empty", () => {
    const existing = [1, 2, 3];
    expect(appendArray(existing, [])).toBe(existing);
  });

  it("returns undefined when existing is undefined and toAdd is empty", () => {
    expect(appendArray(undefined, [])).toBeUndefined();
  });

  it("merges toAdd into existing", () => {
    expect(appendArray([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
  });

  it("handles undefined existing with non-empty toAdd", () => {
    expect(appendArray(undefined, [1, 2])).toEqual([1, 2]);
  });
});

describe("getPluginIdentity", () => {
  it("returns string for string plugin", () => {
    expect(getPluginIdentity("my-plugin" as PluginConfig)).toBe("my-plugin");
  });

  it("returns first element for array with string", () => {
    expect(getPluginIdentity(["my-plugin", {}] as PluginConfig)).toBe("my-plugin");
  });

  it("returns function name for function plugin", () => {
    expect(getPluginIdentity(myPlugin as unknown as PluginConfig)).toBe("myPlugin");
  });

  it("returns null for anonymous function plugin", () => {
    expect(getPluginIdentity((() => {}) as unknown as PluginConfig)).toBeNull();
  });

  it("returns function name for array with named function", () => {
    expect(getPluginIdentity([myPlugin, {}] as unknown as PluginConfig)).toBe("myPlugin");
  });

  it("returns null for array with anonymous function", () => {
    expect(getPluginIdentity([() => {}, {}] as unknown as PluginConfig)).toBeNull();
  });

  it("returns null for unrecognized plugin format", () => {
    expect(getPluginIdentity({} as unknown as PluginConfig)).toBeNull();
  });
});

describe("appendPlugins", () => {
  it("deduplicates by string id", () => {
    const existing: PluginConfig[] = ["plugin-a"];
    const toAdd: PluginConfig[] = ["plugin-a", "plugin-b"];
    expect(appendPlugins(existing, toAdd)).toEqual(["plugin-a", "plugin-b"]);
  });

  it("deduplicates by array[0] string", () => {
    const existing: PluginConfig[] = [["plugin-a", { opt: 1 }]];
    const toAdd: PluginConfig[] = [["plugin-a", { opt: 2 }]];
    expect(appendPlugins(existing, toAdd)).toEqual([["plugin-a", { opt: 1 }]]);
  });

  it("deduplicates by function name", () => {
    const existing: PluginConfig[] = [myPlugin as unknown as PluginConfig];
    const toAdd: PluginConfig[] = [myPlugin as unknown as PluginConfig];
    expect(appendPlugins(existing, toAdd)).toEqual([myPlugin]);
  });

  it("does not deduplicate unidentifiable plugins", () => {
    const existing: PluginConfig[] = [fn1 as unknown as PluginConfig];
    const toAdd: PluginConfig[] = [fn2 as unknown as PluginConfig];
    expect(appendPlugins(existing, toAdd)).toHaveLength(2);
  });

  it("appends all when no duplicates", () => {
    const existing: PluginConfig[] = ["plugin-a"];
    const toAdd: PluginConfig[] = ["plugin-b", "plugin-c"];
    expect(appendPlugins(existing, toAdd)).toEqual(["plugin-a", "plugin-b", "plugin-c"]);
  });
});
