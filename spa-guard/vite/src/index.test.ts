import type { Plugin } from "vite";

import { optionsWindowKey } from "@ovineko/spa-guard/_internal";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VitePluginOptions } from "./index";

vi.mock("html-minifier-terser", () => ({
  minify: vi.fn((html: string) => Promise.resolve(`minified:${html}`)),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(() => Promise.resolve()),
    readFile: vi.fn(() => Promise.resolve("/* inline-script-content */\n")),
    writeFile: vi.fn(() => Promise.resolve()),
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
  const prefix = `window.${optionsWindowKey}=`;
  const optionsStart = script.indexOf(prefix) + prefix.length;
  const jsonEnd = script.indexOf(";/* inline-script-content */");
  return JSON.parse(script.slice(optionsStart, jsonEnd));
};

describe("vite-plugin/spaGuardVitePlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin metadata", () => {
    it("returns a Vite plugin with the correct name", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();

      expect(plugin.name).toBe("@ovineko/spa-guard-vite/vite-plugin");
    });

    it("uses post-order for transformIndexHtml", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();
      const transform = plugin.transformIndexHtml as { order: string };

      expect(transform.order).toBe("post");
    });
  });

  describe("HTML injection", () => {
    it("injects a script tag into head-prepend as the first tag", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin();
      const handler = getTransformHandler(plugin);

      const result = await handler("<html><head></head><body></body></html>");

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

    it("starts with __SPA_GUARD_VERSION__ assignment followed by options and script", async () => {
      const result = await invokeTransform({ version: "1.0.0" });
      const script = result.tags[0].children as string;

      expect(script).toMatch(
        /^window\.__SPA_GUARD_VERSION__="[^"]+";window\.__SPA_GUARD_OPTIONS__=\{/,
      );
    });

    it("contains __SPA_GUARD_VERSION__ with the correct version value", async () => {
      const result = await invokeTransform({ version: "2.5.0" });
      const script = result.tags[0].children as string;

      expect(script).toContain('window.__SPA_GUARD_VERSION__="2.5.0"');
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

    it("removes mode from the serialized options", async () => {
      const result = await invokeTransform({ mode: "inline", version: "1.0.0" });
      const parsed = parseOptionsFromScript(result.tags[0].children as string);

      expect(parsed.mode).toBeUndefined();
    });

    it("removes publicPath from the serialized options", async () => {
      const result = await invokeTransform({ publicPath: "/assets", version: "1.0.0" });
      const parsed = parseOptionsFromScript(result.tags[0].children as string);

      expect(parsed.publicPath).toBeUndefined();
    });

    it("escapes < characters to prevent HTML injection", async () => {
      const result = await invokeTransform({
        html: { fallback: { content: "<script>alert('xss')</script>" } },
      });
      const script = result.tags[0].children as string;

      expect(script).not.toContain("<script>");
      expect(script).toContain("\\u003c");
    });
  });

  describe("fallback HTML minification", () => {
    it("minifies fallback HTML when provided", async () => {
      const { minify } = await import("html-minifier-terser");
      await invokeTransform({ html: { fallback: { content: "<div>  <p>fallback</p>  </div>" } } });

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

  describe("spinner body injection", () => {
    it("injects spinner div into body-prepend by default", async () => {
      const result = await invokeTransform();
      const spinnerTag = result.tags.find(
        (t: { attrs?: { id?: string }; tag: string }) =>
          t.tag === "div" && t.attrs?.id === "__spa-guard-spinner",
      );
      expect(spinnerTag).toBeDefined();
      expect(spinnerTag.injectTo).toBe("body-prepend");
    });

    it("injects overflow hidden script into body-prepend", async () => {
      const result = await invokeTransform();
      const overflowScript = result.tags.find(
        (t: { children?: string; tag: string }) =>
          t.tag === "script" && t.children === "document.body.style.overflow='hidden'",
      );
      expect(overflowScript).toBeDefined();
      expect(overflowScript.injectTo).toBe("body-prepend");
    });

    it("spinner div contains default SVG spinner", async () => {
      const result = await invokeTransform();
      const spinnerTag = result.tags.find(
        (t: { attrs?: { id?: string }; tag: string }) =>
          t.tag === "div" && t.attrs?.id === "__spa-guard-spinner",
      );
      expect(spinnerTag.children).toContain("<svg");
      expect(spinnerTag.children).toContain("spa-guard-spin");
    });

    it("spinner div uses default #fff background", async () => {
      const result = await invokeTransform();
      const spinnerTag = result.tags.find(
        (t: { attrs?: { id?: string }; tag: string }) =>
          t.tag === "div" && t.attrs?.id === "__spa-guard-spinner",
      );
      expect(spinnerTag.attrs.style).toContain("var(--spa-guard-spinner-bg,#fff)");
    });

    it("does not inject :root style for default #fff background", async () => {
      const result = await invokeTransform();
      const rootStyle = result.tags.find(
        (t: { children?: string; tag: string }) =>
          t.tag === "style" && typeof t.children === "string" && t.children.includes(":root"),
      );
      expect(rootStyle).toBeUndefined();
    });

    it("injects :root CSS variable when background differs from #fff", async () => {
      const result = await invokeTransform({ html: { spinner: { background: "#000" } } });
      const rootStyle = result.tags.find(
        (t: { children?: string; tag: string }) =>
          t.tag === "style" && typeof t.children === "string" && t.children.includes(":root"),
      );
      expect(rootStyle).toBeDefined();
      expect(rootStyle.children).toContain("--spa-guard-spinner-bg:#000");
      expect(rootStyle.injectTo).toBe("head");
    });

    it("uses custom spinner content from options", async () => {
      const result = await invokeTransform({
        html: { spinner: { content: "<div>My Spinner</div>" } },
      });
      const spinnerTag = result.tags.find(
        (t: { attrs?: { id?: string }; tag: string }) =>
          t.tag === "div" && t.attrs?.id === "__spa-guard-spinner",
      );
      expect(spinnerTag.children).toBe("<div>My Spinner</div>");
    });

    it("does not inject spinner when spinner.disabled is true", async () => {
      const result = await invokeTransform({ html: { spinner: { disabled: true } } });
      const spinnerTag = result.tags.find(
        (t: { attrs?: { id?: string }; tag: string }) =>
          t.tag === "div" && t.attrs?.id === "__spa-guard-spinner",
      );
      expect(spinnerTag).toBeUndefined();
    });

    it("does not inject overflow script when spinner.disabled is true", async () => {
      const result = await invokeTransform({ html: { spinner: { disabled: true } } });
      const overflowScript = result.tags.find(
        (t: { children?: string; tag: string }) =>
          t.tag === "script" && t.children === "document.body.style.overflow='hidden'",
      );
      expect(overflowScript).toBeUndefined();
    });

    it("only injects the inline script tag when spinner.disabled", async () => {
      const result = await invokeTransform({ html: { spinner: { disabled: true } } });
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].tag).toBe("script");
      expect(result.tags[0].injectTo).toBe("head-prepend");
    });

    it("stores resolved spinner content and background in serialized options", async () => {
      const result = await invokeTransform({ html: { spinner: { background: "#eee" } } });
      const parsed = parseOptionsFromScript(result.tags[0].children as string);
      expect(parsed.html.spinner.background).toBe("#eee");
      expect(parsed.html.spinner.content).toContain("<svg");
    });
  });

  describe("external mode", () => {
    const invokeExternalTransform = async (
      options: Omit<VitePluginOptions, "mode"> = {},
    ): Promise<{ plugin: Plugin; result: Awaited<ReturnType<typeof invokeTransform>> }> => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ ...options, mode: "external" });
      const handler = getTransformHandler(plugin);
      const result = await handler("<html></html>");
      return { plugin, result };
    };

    it("injects a script src tag instead of inline children", async () => {
      const { result } = await invokeExternalTransform({ version: "1.0.0" });
      expect(result.tags[0].tag).toBe("script");
      expect(result.tags[0].injectTo).toBe("head-prepend");
      expect(result.tags[0].attrs?.src).toBeDefined();
      expect(result.tags[0].children).toBeUndefined();
    });

    it("src URL contains a 16-char hex hash in the filename", async () => {
      const { result } = await invokeExternalTransform({ version: "1.0.0" });
      expect(result.tags[0].attrs?.src).toMatch(/^\/spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("src hash is consistent for same version across calls on same plugin instance", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });
      const handler = getTransformHandler(plugin);

      const result1 = await handler("<html></html>");
      const result2 = await handler("<html></html>");

      expect(result1.tags[0].attrs?.src).toBe(result2.tags[0].attrs?.src);
    });

    it("src hash is consistent for same version across different plugin instances", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin1 = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });
      const plugin2 = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });

      const result1 = await getTransformHandler(plugin1)("<html></html>");
      const result2 = await getTransformHandler(plugin2)("<html></html>");

      expect(result1.tags[0].attrs?.src).toBe(result2.tags[0].attrs?.src);
    });

    it("src hash differs for different versions", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin1 = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });
      const plugin2 = spaGuardVitePlugin({ mode: "external", version: "2.0.0" });

      const result1 = await getTransformHandler(plugin1)("<html></html>");
      const result2 = await getTransformHandler(plugin2)("<html></html>");

      expect(result1.tags[0].attrs?.src).not.toBe(result2.tags[0].attrs?.src);
    });

    it("uses default / publicPath when not specified", async () => {
      const { result } = await invokeExternalTransform({ version: "1.0.0" });
      expect(result.tags[0].attrs?.src).toMatch(/^\/spa-guard\./);
    });

    it("respects custom publicPath option", async () => {
      const { result } = await invokeExternalTransform({
        publicPath: "/assets",
        version: "1.0.0",
      });
      expect(result.tags[0].attrs?.src).toMatch(/^\/assets\/spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("respects custom publicPath with trailing slash", async () => {
      const { result } = await invokeExternalTransform({
        publicPath: "/assets/",
        version: "1.0.0",
      });
      expect(result.tags[0].attrs?.src).toMatch(/^\/assets\/spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("still injects spinner div by default", async () => {
      const { result } = await invokeExternalTransform({ version: "1.0.0" });
      const spinnerTag = result.tags.find(
        (t: { attrs?: { id?: string }; tag: string }) =>
          t.tag === "div" && t.attrs?.id === "__spa-guard-spinner",
      );
      expect(spinnerTag).toBeDefined();
      expect(spinnerTag.injectTo).toBe("body-prepend");
    });

    it("does not inject spinner when spinner.disabled is true", async () => {
      const { result } = await invokeExternalTransform({
        html: { spinner: { disabled: true } },
        version: "1.0.0",
      });
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].tag).toBe("script");
      expect(result.tags[0].attrs?.src).toBeDefined();
    });

    it("writeBundle writes script file to outDir from configResolved", async () => {
      const fsMod = await import("node:fs/promises");
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });

      // Set outDir via configResolved
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (plugin.configResolved as (config: any) => void)({ build: { outDir: "/project/dist" } });

      // Populate cache via transformIndexHtml
      const handler = getTransformHandler(plugin);
      await handler("<html></html>");

      // Trigger writeBundle
      await (plugin.writeBundle as () => Promise<void>).call({});

      expect(fsMod.default.mkdir).toHaveBeenCalledWith("/project/dist", { recursive: true });
      expect(fsMod.default.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("spa-guard."),
        expect.any(String),
        "utf8",
      );
    });

    it("writeBundle writes script file to externalScriptDir when specified", async () => {
      const fsMod = await import("node:fs/promises");
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({
        externalScriptDir: "/custom/dir",
        mode: "external",
        version: "1.0.0",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (plugin.configResolved as (config: any) => void)({ build: { outDir: "/project/dist" } });

      const handler = getTransformHandler(plugin);
      await handler("<html></html>");

      await (plugin.writeBundle as () => Promise<void>).call({});

      expect(fsMod.default.mkdir).toHaveBeenCalledWith("/custom/dir", { recursive: true });
    });

    it("filename in writeBundle matches the hash in the src URL", async () => {
      const fsMod = await import("node:fs/promises");
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (plugin.configResolved as (config: any) => void)({ build: { outDir: "/project/dist" } });

      const handler = getTransformHandler(plugin);
      const result = await handler("<html></html>");
      const srcUrl = result.tags[0].attrs?.src as string;
      const fileName = srcUrl.split("/").pop()!;

      await (plugin.writeBundle as () => Promise<void>).call({});

      expect(fsMod.default.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(fileName),
        expect.any(String),
        "utf8",
      );
    });

    it("does not call mkdir or writeFile when writeBundle runs without prior transformIndexHtml", async () => {
      const fsMod = await import("node:fs/promises");
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (plugin.configResolved as (config: any) => void)({ build: { outDir: "/project/dist" } });

      // Do NOT call transformIndexHtml - cache is empty
      await (plugin.writeBundle as () => Promise<void>).call({});

      expect(fsMod.default.mkdir).not.toHaveBeenCalled();
      expect(fsMod.default.writeFile).not.toHaveBeenCalled();
    });

    it("reads from dist-inline-trace when trace option is true", async () => {
      const fsMod = await import("node:fs/promises");
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ mode: "external", trace: true, version: "1.0.0" });
      const handler = getTransformHandler(plugin);
      await handler("<html></html>");

      expect(fsMod.default.readFile).toHaveBeenCalledWith(
        expect.stringContaining("dist-inline-trace/index.js"),
        "utf8",
      );
    });

    it("falls back to inline mode when configResolved reports serve command", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (plugin.configResolved as (config: any) => void)({
        base: "/",
        build: { outDir: "/project/dist" },
        command: "serve",
      });

      const handler = getTransformHandler(plugin);
      const result = await handler("<html></html>");

      expect(result.tags[0].tag).toBe("script");
      expect(result.tags[0].injectTo).toBe("head-prepend");
      expect(result.tags[0].attrs?.src).toBeUndefined();
      expect(result.tags[0].children).toBeDefined();
    });

    it("uses Vite config.base as default publicPath when publicPath is not specified", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({ mode: "external", version: "1.0.0" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (plugin.configResolved as (config: any) => void)({
        base: "/app/",
        build: { outDir: "/project/dist" },
        command: "build",
      });

      const handler = getTransformHandler(plugin);
      const result = await handler("<html></html>");

      expect(result.tags[0].attrs?.src).toMatch(/^\/app\/spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("publicPath option takes precedence over Vite config.base", async () => {
      const spaGuardVitePlugin = await importPlugin();
      const plugin = spaGuardVitePlugin({
        mode: "external",
        publicPath: "/assets",
        version: "1.0.0",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (plugin.configResolved as (config: any) => void)({
        base: "/app/",
        build: { outDir: "/project/dist" },
        command: "build",
      });

      const handler = getTransformHandler(plugin);
      const result = await handler("<html></html>");

      expect(result.tags[0].attrs?.src).toMatch(/^\/assets\/spa-guard\.[a-f0-9]{16}\.js$/);
    });
  });
});
