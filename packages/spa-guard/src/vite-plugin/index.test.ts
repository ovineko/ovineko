import type { Plugin } from "vite";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VitePluginOptions } from "./index";

import { optionsWindowKey } from "../common/options";

vi.mock("html-minifier-terser", () => ({
  minify: vi.fn((html: string) => Promise.resolve(`minified:${html}`)),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(() => Promise.resolve("/* inline-script-content */\n")),
  },
}));

const importPlugin = async () => {
  const mod = await import("./index");
  return mod.spaGuardVitePlugin;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getTransformHandler = (plugin: Plugin) => {
  return (plugin.transformIndexHtml as { handler: (html: string) => Promise<any> }).handler;
};

const invokeTransform = async (options: VitePluginOptions = {}) => {
  const spaGuardVitePlugin = await importPlugin();
  const plugin = spaGuardVitePlugin(options);
  const handler = getTransformHandler(plugin);
  return handler("<html></html>");
};

const parseOptionsFromScript = (script: string) => {
  const jsonStart = script.indexOf("{");
  const jsonEnd = script.indexOf(";/* inline-script-content */");
  return JSON.parse(script.slice(jsonStart, jsonEnd));
};

describe("vite-plugin/spaGuardVitePlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin metadata", () => {
    it("returns a Vite plugin with the correct name", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();

      expect(plugin.name).toBe("@ovineko/spa-guard/vite-plugin");
    });

    it("uses post-order for transformIndexHtml", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();
      const transform = plugin.transformIndexHtml as { order: string };

      expect(transform.order).toBe("post");
    });
  });

  describe("HTML injection", () => {
    it("injects a script tag into head-prepend", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();
      const handler = getTransformHandler(plugin);

      const result = await handler("<html><head></head><body></body></html>");

      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].tag).toBe("script");
      expect(result.tags[0].injectTo).toBe("head-prepend");
    });

    it("preserves the original HTML in the result", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();
      const handler = getTransformHandler(plugin);
      const inputHtml = "<html><head></head><body>Hello</body></html>";

      const result = await handler(inputHtml);

      expect(result.html).toBe(inputHtml);
    });
  });

  describe("script content", () => {
    it("contains __SPA_GUARD_OPTIONS__ assignment", async () => {
      const result = await invokeTransform();

      expect(result.tags[0].children).toContain(`window.${optionsWindowKey}=`);
    });

    it("contains the inline script from the file", async () => {
      const result = await invokeTransform();

      expect(result.tags[0].children).toContain("/* inline-script-content */");
    });

    it("starts with options assignment followed by script", async () => {
      const result = await invokeTransform();
      const script = result.tags[0].children as string;

      expect(script).toMatch(/^window\.__SPA_GUARD_OPTIONS__=\{/);
    });
  });

  describe("options serialization", () => {
    it("serializes custom options into the script content", async () => {
      const result = await invokeTransform({ reloadDelays: [500, 1000], useRetryId: false });
      const parsed = parseOptionsFromScript(result.tags[0].children as string);

      expect(parsed.reloadDelays).toEqual([500, 1000]);
      expect(parsed.useRetryId).toBe(false);
    });

    it("removes trace from the serialized options", async () => {
      const result = await invokeTransform({ reloadDelays: [100], trace: true });
      const parsed = parseOptionsFromScript(result.tags[0].children as string);

      expect(parsed.trace).toBeUndefined();
      expect(parsed.reloadDelays).toEqual([100]);
    });

    it("escapes < characters to prevent HTML injection", async () => {
      const result = await invokeTransform({
        fallback: { html: "<script>alert('xss')</script>" },
      });
      const script = result.tags[0].children as string;

      expect(script).not.toContain("<script>");
      expect(script).toContain("\\u003c");
    });
  });

  describe("fallback HTML minification", () => {
    it("minifies fallback HTML when provided", async () => {
      const { minify } = await import("html-minifier-terser");
      await invokeTransform({ fallback: { html: "<div>  <p>fallback</p>  </div>" } });

      expect(minify).toHaveBeenCalledWith(
        "<div>  <p>fallback</p>  </div>",
        expect.objectContaining({
          collapseWhitespace: true,
          minifyCSS: true,
          removeComments: true,
        }),
      );
    });

    it("does not minify when no fallback html is provided", async () => {
      const { minify } = await import("html-minifier-terser");
      await invokeTransform();

      expect(minify).not.toHaveBeenCalled();
    });
  });

  describe("version auto-generation", () => {
    it("auto-generates a UUID version when no version is provided", async () => {
      const result = await invokeTransform();
      const parsed = parseOptionsFromScript(result.tags[0].children as string);

      expect(parsed.version).toBeDefined();
      expect(parsed.version).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("uses the explicit version when provided", async () => {
      const result = await invokeTransform({ version: "1.2.3" });
      const parsed = parseOptionsFromScript(result.tags[0].children as string);

      expect(parsed.version).toBe("1.2.3");
    });

    it("uses the same auto-generated version across multiple transforms", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();
      const handler = getTransformHandler(plugin);

      const result1 = await handler("<html></html>");
      const result2 = await handler("<html></html>");

      const parsed1 = parseOptionsFromScript(result1.tags[0].children as string);
      const parsed2 = parseOptionsFromScript(result2.tags[0].children as string);

      expect(parsed1.version).toBe(parsed2.version);
    });

    it("generates different versions for different plugin instances", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin1 = spaGuardVitePlugin();
      const plugin2 = spaGuardVitePlugin();

      const handler1 = getTransformHandler(plugin1);
      const handler2 = getTransformHandler(plugin2);

      const result1 = await handler1("<html></html>");
      const result2 = await handler2("<html></html>");

      const parsed1 = parseOptionsFromScript(result1.tags[0].children as string);
      const parsed2 = parseOptionsFromScript(result2.tags[0].children as string);

      expect(parsed1.version).not.toBe(parsed2.version);
    });
  });

  describe("inline script file reading", () => {
    it("reads from dist-inline by default (non-trace mode)", async () => {
      const fsMod = await import("node:fs/promises");
      await invokeTransform();

      expect(fsMod.default.readFile).toHaveBeenCalledWith(
        expect.stringContaining("dist-inline/index.js"),
        "utf8",
      );
      expect(fsMod.default.readFile).not.toHaveBeenCalledWith(
        expect.stringContaining("dist-inline-trace"),
        "utf8",
      );
    });

    it("reads from dist-inline-trace when trace option is true", async () => {
      const fsMod = await import("node:fs/promises");
      await invokeTransform({ trace: true });

      expect(fsMod.default.readFile).toHaveBeenCalledWith(
        expect.stringContaining("dist-inline-trace/index.js"),
        "utf8",
      );
    });
  });
});
