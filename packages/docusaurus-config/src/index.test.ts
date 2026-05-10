import type { Config } from "@docusaurus/types";

import { afterEach, describe, expect, it, vi } from "vitest";

import { withOvinekoDocs } from "./index.js";

function getPluginId(p: unknown): unknown {
  if (Array.isArray(p)) {
    return p[0];
  }
  if (typeof p === "string") {
    return p;
  }
  return null;
}

vi.mock("node:module", () => ({
  createRequire: () => ({
    resolve: (id: string) => id,
  }),
}));

const baseConfig: Config = {
  title: "Test Site",
  url: "https://example.com",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("withOvinekoDocs", () => {
  it("applies default options (future, llms, copyPageButton, markdownAlternate enabled)", () => {
    const result = withOvinekoDocs(baseConfig);

    expect(result.future).toEqual({ faster: true, v4: true });
    expect(result.plugins).toBeDefined();
    expect(result.plugins!.length).toBeGreaterThanOrEqual(3);
    expect(result.headTags).toBeDefined();
    expect(result.headTags!.length).toBe(1);
  });

  it("does not add idealImage or umami scripts by default", () => {
    const result = withOvinekoDocs(baseConfig);

    const pluginIds = result.plugins!.map(getPluginId);
    expect(pluginIds).not.toContain("@docusaurus/plugin-ideal-image");
    expect(result.scripts).toBeUndefined();
  });

  it("does not duplicate existing plugins", () => {
    const config: Config = {
      ...baseConfig,
      plugins: ["docusaurus-plugin-llms"],
    };
    const result = withOvinekoDocs(config);

    const llmsPlugins = result.plugins!.filter((p) => {
      if (typeof p === "string") {
        return p === "docusaurus-plugin-llms";
      }
      if (Array.isArray(p)) {
        return p[0] === "docusaurus-plugin-llms";
      }
      return false;
    });
    expect(llmsPlugins).toHaveLength(1);
  });

  describe("future option", () => {
    it("preserves config.future when future: false", () => {
      const config: Config = {
        ...baseConfig,
        future: { faster: false } as Config["future"],
      };
      const result = withOvinekoDocs(config, { future: false });

      expect(result.future).toEqual({ faster: false });
    });

    it("merges object future with config.future (config wins)", () => {
      const config: Config = {
        ...baseConfig,
        future: { faster: false } as Config["future"],
      };
      const result = withOvinekoDocs(config, { future: { faster: true, v4: true } });

      expect(result.future).toEqual({ faster: false, v4: true });
    });
  });

  describe("llms option", () => {
    it("skips llms plugin and headTag when llms: false", () => {
      const result = withOvinekoDocs(baseConfig, { llms: false });

      const pluginIds = result.plugins!.map(getPluginId);
      expect(pluginIds).not.toContain("docusaurus-plugin-llms");
      expect(result.headTags).toBeUndefined();
    });

    it("uses custom llms config when object provided", () => {
      const customLlms = { generateLLMsFullTxt: false, generateLLMsTxt: true };
      const result = withOvinekoDocs(baseConfig, { llms: customLlms });

      const llmsPlugin = result.plugins!.find(
        (p) => Array.isArray(p) && p[0] === "docusaurus-plugin-llms",
      );
      expect(llmsPlugin).toBeDefined();
      expect((llmsPlugin as [string, Record<string, unknown>])[1]).toEqual(customLlms);
    });
  });

  describe("umami option", () => {
    it("adds script only when NODE_ENV=production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const result = withOvinekoDocs(baseConfig, {
        umami: { src: "https://analytics.example.com/script.js", websiteId: "abc-123" },
      });

      expect(result.scripts).toHaveLength(1);
      expect(result.scripts![0]).toEqual({
        async: true,
        "data-website-id": "abc-123",
        src: "https://analytics.example.com/script.js",
      });
    });

    it("does not add script when NODE_ENV is not production", () => {
      vi.stubEnv("NODE_ENV", "development");
      const result = withOvinekoDocs(baseConfig, {
        umami: { src: "https://analytics.example.com/script.js", websiteId: "abc-123" },
      });

      expect(result.scripts).toBeUndefined();
    });
  });

  describe("idealImage option", () => {
    it("uses default config when idealImage: true", () => {
      const result = withOvinekoDocs(baseConfig, { idealImage: true });

      const plugin = result.plugins!.find(
        (p) => Array.isArray(p) && p[0] === "@docusaurus/plugin-ideal-image",
      );
      expect(plugin).toBeDefined();
      expect((plugin as [string, Record<string, unknown>])[1]).toEqual({
        disableInDev: false,
        max: 1030,
        min: 640,
        quality: 70,
        steps: 2,
      });
    });

    it("uses custom config when object provided", () => {
      const custom = { max: 2000, min: 300, quality: 85, steps: 4 };
      const result = withOvinekoDocs(baseConfig, { idealImage: custom });

      const plugin = result.plugins!.find(
        (p) => Array.isArray(p) && p[0] === "@docusaurus/plugin-ideal-image",
      );
      expect((plugin as [string, Record<string, unknown>])[1]).toEqual(custom);
    });
  });

  describe("copyPageButton option", () => {
    it("adds plugin by default", () => {
      const result = withOvinekoDocs(baseConfig);

      const hasPlugin = result.plugins!.some(
        (p) => typeof p === "string" && p === "docusaurus-plugin-copy-page-button",
      );
      expect(hasPlugin).toBe(true);
    });

    it("skips plugin when false", () => {
      const result = withOvinekoDocs(baseConfig, { copyPageButton: false });

      const hasPlugin = result.plugins!.some(
        (p) => typeof p === "string" && p === "docusaurus-plugin-copy-page-button",
      );
      expect(hasPlugin).toBe(false);
    });
  });

  describe("markdownAlternate option", () => {
    it("adds plugin by default", () => {
      const result = withOvinekoDocs(baseConfig);
      expect(result.plugins!.length).toBeGreaterThanOrEqual(3);
    });

    it("skips plugin when false", () => {
      const result = withOvinekoDocs(baseConfig, { markdownAlternate: false });

      const pluginCount = result.plugins!.length;
      const resultWithMd = withOvinekoDocs(baseConfig, { markdownAlternate: true });
      expect(pluginCount).toBeLessThan(resultWithMd.plugins!.length);
    });
  });
});
