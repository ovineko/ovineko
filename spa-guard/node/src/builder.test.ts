import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BuildExternalScriptOptions } from "./builder";

import { buildExternalScript, buildSpaGuardScript } from "./builder";

vi.mock("html-minifier-terser", () => ({
  minify: vi.fn((html: string) => Promise.resolve(`minified:${html}`)),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(() => Promise.resolve()),
    readFile: vi.fn(() => Promise.resolve("/* spa-guard-inline-script */")),
    writeFile: vi.fn(() => Promise.resolve()),
  },
}));

describe("builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildSpaGuardScript", () => {
    it("returns scriptContent containing the inline script", async () => {
      const result = await buildSpaGuardScript();
      expect(result.scriptContent).toContain("/* spa-guard-inline-script */");
    });

    it("returns a 16-char hex hash", async () => {
      const result = await buildSpaGuardScript();
      expect(result.hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it("hash is consistent for the same options and version", async () => {
      const result1 = await buildSpaGuardScript({ version: "1.0.0" });
      const result2 = await buildSpaGuardScript({ version: "1.0.0" });
      expect(result1.hash).toBe(result2.hash);
    });

    it("hash differs when options change", async () => {
      const result1 = await buildSpaGuardScript({ version: "1.0.0" });
      const result2 = await buildSpaGuardScript({ version: "2.0.0" });
      expect(result1.hash).not.toBe(result2.hash);
    });

    it("auto-generates a UUID version when not provided", async () => {
      const result = await buildSpaGuardScript();
      expect(result.scriptContent).toMatch(
        /window\.__SPA_GUARD_VERSION__="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"/,
      );
    });

    it("uses the provided version", async () => {
      const result = await buildSpaGuardScript({ version: "3.1.4" });
      expect(result.scriptContent).toContain('window.__SPA_GUARD_VERSION__="3.1.4"');
    });

    it("escapes < characters in options JSON", async () => {
      const result = await buildSpaGuardScript({
        html: { fallback: { content: "<script>xss</script>" } },
        version: "1.0.0",
      });
      expect(result.scriptContent).not.toContain("<script>");
      expect(result.scriptContent).toContain("\\u003c");
    });

    it("returns structured tags array with script tag first", async () => {
      const result = await buildSpaGuardScript({ version: "1.0.0" });
      expect(result.tags[0]).toMatchObject({
        injectTo: "head-prepend",
        tag: "script",
      });
      expect(result.tags[0].children).toBe(result.scriptContent);
    });

    it("includes spinner tags by default", async () => {
      const result = await buildSpaGuardScript({ version: "1.0.0" });
      const spinnerDiv = result.tags.find((t) => t.tag === "div" && t.attrs?.id);
      expect(spinnerDiv).toBeDefined();
      expect(spinnerDiv?.injectTo).toBe("body-prepend");
    });

    it("omits spinner tags when spinner.disabled is true", async () => {
      const result = await buildSpaGuardScript({
        spinner: { disabled: true },
        version: "1.0.0",
      });
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].tag).toBe("script");
    });

    it("includes overflow script when spinner is enabled", async () => {
      const result = await buildSpaGuardScript({ version: "1.0.0" });
      const overflowScript = result.tags.find(
        (t) => t.tag === "script" && t.children === "document.body.style.overflow='hidden'",
      );
      expect(overflowScript).toBeDefined();
    });

    it("includes :root style tag when background is not #fff", async () => {
      const result = await buildSpaGuardScript({
        spinner: { background: "#000" },
        version: "1.0.0",
      });
      const rootStyle = result.tags.find((t) => t.tag === "style" && t.children?.includes(":root"));
      expect(rootStyle).toBeDefined();
      expect(rootStyle?.children).toContain("--spa-guard-spinner-bg:#000");
    });

    it("does not include :root style tag for default #fff background", async () => {
      const result = await buildSpaGuardScript({ version: "1.0.0" });
      const rootStyle = result.tags.find((t) => t.tag === "style" && t.children?.includes(":root"));
      expect(rootStyle).toBeUndefined();
    });

    it("returns html array with one string per tag", async () => {
      const result = await buildSpaGuardScript({ version: "1.0.0" });
      expect(result.html).toHaveLength(result.tags.length);
      for (const htmlStr of result.html) {
        expect(htmlStr).toMatch(/^<\w/);
      }
    });

    it("reads from dist-inline by default", async () => {
      const fsMod = await import("node:fs/promises");
      await buildSpaGuardScript();
      expect(fsMod.default.readFile).toHaveBeenCalledWith(
        expect.stringContaining("dist-inline/index.js"),
        "utf8",
      );
    });

    it("reads from dist-inline-trace when trace is true", async () => {
      const fsMod = await import("node:fs/promises");
      await buildSpaGuardScript({ trace: true });
      expect(fsMod.default.readFile).toHaveBeenCalledWith(
        expect.stringContaining("dist-inline-trace/index.js"),
        "utf8",
      );
    });

    it("does not include trace in serialized options", async () => {
      const result = await buildSpaGuardScript({ trace: true, version: "1.0.0" });
      const optionsMatch = result.scriptContent.match(/window\.__SPA_GUARD_OPTIONS__=(\{.*?\});/);
      expect(optionsMatch).toBeTruthy();
      if (optionsMatch) {
        const parsed = JSON.parse(optionsMatch[1]!);
        expect(parsed.trace).toBeUndefined();
      }
    });

    it("minifies fallback HTML when provided", async () => {
      const { minify } = await import("html-minifier-terser");
      await buildSpaGuardScript({
        html: { fallback: { content: "<div>  fallback  </div>" } },
        version: "1.0.0",
      });
      expect(minify).toHaveBeenCalledWith(
        "<div>  fallback  </div>",
        expect.objectContaining({ collapseWhitespace: true }),
      );
    });
  });

  describe("buildExternalScript", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = join(tmpdir(), `spa-guard-test-${Date.now()}`);
    });

    afterEach(() => {
      try {
        rmSync(tempDir, { force: true, recursive: true });
      } catch {}
    });

    const makeOpts = (overrides: Partial<BuildExternalScriptOptions> = {}) => ({
      outDir: tempDir,
      version: "1.0.0",
      ...overrides,
    });

    it("returns a fileName with content hash", async () => {
      const result = await buildExternalScript(makeOpts());
      expect(result.fileName).toMatch(/^spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("fileName hash is consistent for same options", async () => {
      const result1 = await buildExternalScript(makeOpts());
      const result2 = await buildExternalScript(makeOpts());
      expect(result1.fileName).toBe(result2.fileName);
    });

    it("fileName hash differs for different options", async () => {
      const result1 = await buildExternalScript(makeOpts({ version: "1.0.0" }));
      const result2 = await buildExternalScript(makeOpts({ version: "2.0.0" }));
      expect(result1.fileName).not.toBe(result2.fileName);
    });

    it("writes script file to outDir", async () => {
      const fsMod = await import("node:fs/promises");
      const result = await buildExternalScript(makeOpts());
      expect(fsMod.default.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(result.fileName),
        expect.any(String),
        "utf8",
      );
      expect(fsMod.default.mkdir).toHaveBeenCalledWith(tempDir, { recursive: true });
    });

    it("returns publicUrl with default / prefix", async () => {
      const result = await buildExternalScript(makeOpts());
      expect(result.publicUrl).toMatch(/^\/spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("respects custom publicPath", async () => {
      const result = await buildExternalScript(makeOpts({ publicPath: "/assets" }));
      expect(result.publicUrl).toMatch(/^\/assets\/spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("respects custom publicPath with trailing slash", async () => {
      const result = await buildExternalScript(makeOpts({ publicPath: "/assets/" }));
      expect(result.publicUrl).toMatch(/^\/assets\/spa-guard\.[a-f0-9]{16}\.js$/);
    });

    it("returns a script tag with src pointing to publicUrl", async () => {
      const result = await buildExternalScript(makeOpts());
      expect(result.tags[0]).toMatchObject({
        attrs: { src: result.publicUrl },
        injectTo: "head-prepend",
        tag: "script",
      });
      expect(result.tags[0].children).toBeUndefined();
    });

    it("includes spinner tags by default", async () => {
      const result = await buildExternalScript(makeOpts());
      const spinnerDiv = result.tags.find((t) => t.tag === "div" && t.attrs?.id);
      expect(spinnerDiv).toBeDefined();
    });

    it("omits spinner when spinner.disabled is true", async () => {
      const result = await buildExternalScript(makeOpts({ spinner: { disabled: true } }));
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].tag).toBe("script");
    });

    it("returns html array with one string per tag", async () => {
      const result = await buildExternalScript(makeOpts());
      expect(result.html).toHaveLength(result.tags.length);
      expect(result.html[0]).toContain(`src="${result.publicUrl}"`);
    });

    it("html[0] contains correct script src tag", async () => {
      const result = await buildExternalScript(makeOpts());
      expect(result.html[0]).toBe(`<script src="${result.publicUrl}"></script>`);
    });
  });

  describe("buildSpaGuardScript + buildExternalScript consistency", () => {
    it("both produce the same hash for the same options", async () => {
      const inlineResult = await buildSpaGuardScript({ version: "1.0.0" });
      const externalResult = await buildExternalScript({ outDir: "/tmp", version: "1.0.0" });
      expect(inlineResult.hash).toBe(
        externalResult.fileName.replace("spa-guard.", "").replace(".js", ""),
      );
    });
  });
});
