import type { LoadContext } from "@docusaurus/types";

import { afterEach, describe, expect, it, vi } from "vitest";

import markdownAlternatePlugin from "./markdown-alternate.js";

vi.mock("node:fs");

const fs = await import("node:fs");

function createContext(url = "https://example.com"): LoadContext {
  return { siteConfig: { url } } as unknown as LoadContext;
}

function createFsTree(files: Record<string, string>) {
  const existingPaths = new Set(Object.keys(files));

  vi.mocked(fs.existsSync).mockImplementation((p) => existingPaths.has(String(p)));
  vi.mocked(fs.readFileSync).mockImplementation((p) => {
    const content = files[String(p)];
    if (content === undefined) {
      throw new Error(`ENOENT: ${String(p)}`);
    }
    return content;
  });
  vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  vi.mocked(fs.readdirSync).mockImplementation((dir) => {
    const dirStr = String(dir);
    const entries: ReturnType<typeof fs.readdirSync> = [];
    const initialPaths = [...existingPaths];
    const discoveredPaths = new Set<string>();
    for (const filePath of initialPaths) {
      const relative = filePath.startsWith(dirStr + "/") ? filePath.slice(dirStr.length + 1) : null;
      if (relative && !relative.includes("/")) {
        entries.push({
          isDirectory: () => false,
          isFile: () => true,
          name: relative,
        } as unknown as ReturnType<typeof fs.readdirSync>[number]);
      } else if (relative && relative.includes("/")) {
        const subdir = relative.split("/")[0]!;
        if (!discoveredPaths.has(`${dirStr}/${subdir}`)) {
          discoveredPaths.add(`${dirStr}/${subdir}`);
          entries.push({
            isDirectory: () => true,
            isFile: () => false,
            name: subdir,
          } as unknown as ReturnType<typeof fs.readdirSync>[number]);
        }
      }
    }
    for (const path of discoveredPaths) existingPaths.add(path);
    return entries;
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("markdownAlternatePlugin", () => {
  it("injects link tags into HTML files that have matching .md", async () => {
    const outDir = "/build";
    createFsTree({
      "/build/docs/intro.html": "<html><head></head><body></body></html>",
      "/build/docs/intro.md": "# Intro",
      "/build/sitemap.xml": "<urlset></urlset>",
    });

    const plugin = markdownAlternatePlugin(createContext(), {});
    await plugin.postBuild!({ outDir } as any);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/build/docs/intro.html",
      expect.stringContaining('<link rel="alternate" type="text/markdown" href="/docs/intro.md"/>'),
    );
  });

  it("skips injection if link already exists", async () => {
    const outDir = "/build";
    const existingHtml =
      '<html><head><link rel="alternate" type="text/markdown" href="/docs/intro.md"/></head><body></body></html>';
    createFsTree({
      "/build/docs/intro.html": existingHtml,
      "/build/docs/intro.md": "# Intro",
      "/build/sitemap.xml": "<urlset></urlset>",
    });

    const plugin = markdownAlternatePlugin(createContext(), {});
    await plugin.postBuild!({ outDir } as any);

    const htmlWrites = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter(([p]) => String(p).endsWith(".html"));
    expect(htmlWrites).toHaveLength(0);
  });

  it("patches sitemap.xml with alternate link (no trailing slash)", async () => {
    const outDir = "/build";
    createFsTree({
      "/build/docs/guide.html": "<html><head></head><body></body></html>",
      "/build/docs/guide.md": "# Guide",
      "/build/sitemap.xml": "<urlset><url><loc>https://example.com/docs/guide</loc></url></urlset>",
    });

    const plugin = markdownAlternatePlugin(createContext(), {});
    await plugin.postBuild!({ outDir } as any);

    const sitemapWrite = vi
      .mocked(fs.writeFileSync)
      .mock.calls.find(([p]) => String(p).endsWith("sitemap.xml"));
    expect(sitemapWrite).toBeDefined();
    expect(sitemapWrite![1]).toContain(
      '<xhtml:link rel="alternate" type="text/markdown" href="https://example.com/docs/guide.md"/>',
    );
  });

  it("patches sitemap.xml with trailing slash in loc", async () => {
    const outDir = "/build";
    createFsTree({
      "/build/docs/guide.html": "<html><head></head><body></body></html>",
      "/build/docs/guide.md": "# Guide",
      "/build/sitemap.xml":
        "<urlset><url><loc>https://example.com/docs/guide/</loc></url></urlset>",
    });

    const plugin = markdownAlternatePlugin(createContext(), {});
    await plugin.postBuild!({ outDir } as any);

    const sitemapWrite = vi
      .mocked(fs.writeFileSync)
      .mock.calls.find(([p]) => String(p).endsWith("sitemap.xml"));
    expect(sitemapWrite).toBeDefined();
    expect(sitemapWrite![1]).toContain(
      '<xhtml:link rel="alternate" type="text/markdown" href="https://example.com/docs/guide.md"/>',
    );
  });

  it("does nothing when no .md files exist", async () => {
    const outDir = "/build";
    createFsTree({
      "/build/docs/intro.html": "<html><head></head><body></body></html>",
      "/build/sitemap.xml": "<urlset></urlset>",
    });

    const plugin = markdownAlternatePlugin(createContext(), { maxWaitMs: 0 });
    await plugin.postBuild!({ outDir } as any);

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("handles missing sitemap gracefully", async () => {
    const outDir = "/build";
    createFsTree({
      "/build/docs/intro.html": "<html><head></head><body></body></html>",
      "/build/docs/intro.md": "# Intro",
    });

    const plugin = markdownAlternatePlugin(createContext(), {});
    await plugin.postBuild!({ outDir } as any);

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/build/docs/intro.html",
      expect.stringContaining('<link rel="alternate"'),
    );
  });
});
