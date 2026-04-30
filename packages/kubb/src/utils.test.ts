import { describe, expect, it } from "vitest";

import {
  createPluginOptions,
  defaultDisabledEslintRules,
  defaultOutputFooter,
  fixGroupName,
  getDefaultOutputBanner,
} from "./utils";

describe("createPluginOptions", () => {
  it("returns options unchanged when no createOptions provided", () => {
    const options = { foo: "bar" };
    expect(createPluginOptions(options)).toBe(options);
  });

  it("returns options unchanged when plugin has no createOptions", () => {
    const options = { foo: "bar" };
    expect(createPluginOptions(options, {})).toBe(options);
  });

  it("applies createOptions when provided", () => {
    const options = { value: 1 };
    const result = createPluginOptions(options, {
      createOptions: (o) => ({ ...o, value: 2 }),
    });
    expect(result).toEqual({ value: 2 });
  });
});

describe("getDefaultOutputBanner", () => {
  it("includes all disabled rules in the banner", () => {
    const rules = ["rule-a", "rule-b"];
    const banner = getDefaultOutputBanner(rules);
    expect(banner).toContain("rule-a, rule-b");
    expect(banner).toContain("/* eslint-disable");
    expect(banner).toContain("/* tslint:disable */");
  });

  it("produces the same banner for defaultDisabledEslintRules", () => {
    const banner = getDefaultOutputBanner(defaultDisabledEslintRules);
    for (const rule of defaultDisabledEslintRules) {
      expect(banner).toContain(rule);
    }
  });
});

describe("defaultOutputFooter", () => {
  it("is a string", () => {
    expect(typeof defaultOutputFooter).toBe("string");
  });
});

describe("fixGroupName", () => {
  it("camelCases group + suffix", () => {
    const fn = fixGroupName({ plugin: "client", suffix: "Service" });
    expect(fn({ group: "pet" })).toBe("petService");
  });

  it("handles multi-word group names", () => {
    const fn = fixGroupName({ plugin: "swr", suffix: "Hooks" });
    expect(fn({ group: "pet store" })).toBe("petStoreHooks");
  });

  it("handles hyphenated group names", () => {
    const fn = fixGroupName({ plugin: "msw", suffix: "Service" });
    expect(fn({ group: "user-profile" })).toBe("userProfileService");
  });
});
