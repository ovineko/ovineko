import type { LoadContext, Plugin } from "@docusaurus/types";

import fs from "node:fs";
import path from "node:path";

interface MarkdownAlternatePluginOptions {
  intervalMs?: number;
  maxWaitMs?: number;
}

export default function markdownAlternatePlugin(
  context: LoadContext,
  options: MarkdownAlternatePluginOptions,
): Plugin {
  const siteUrl = context.siteConfig.url;
  const maxWaitMs = options.maxWaitMs ?? 10_000;
  const intervalMs = options.intervalMs ?? 200;

  return {
    name: "markdown-alternate",

    async postBuild({ outDir }) {
      const htmlFiles = await waitForMdFiles(outDir, maxWaitMs, intervalMs);

      for (const { filePath, mdHref } of htmlFiles) {
        let html = fs.readFileSync(filePath, "utf8");
        const linkTag = `<link rel="alternate" type="text/markdown" href="${mdHref}"/>`;
        if (!html.includes(linkTag)) {
          html = html.replace("</head>", `${linkTag}</head>`);
          fs.writeFileSync(filePath, html);
        }
      }

      const sitemapPath = path.join(outDir, "sitemap.xml");
      if (fs.existsSync(sitemapPath) && htmlFiles.length > 0) {
        let sitemap = fs.readFileSync(sitemapPath, "utf8");

        for (const { mdHref } of htmlFiles) {
          sitemap = patchSitemapEntry(sitemap, siteUrl, mdHref);
        }

        fs.writeFileSync(sitemapPath, sitemap);
      }
    },
  };
}

function collectHtmlWithMd(outDir: string) {
  const results: { filePath: string; mdHref: string }[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".html")) {
        const mdPath = fullPath.replace(/\.html$/u, ".md");
        if (fs.existsSync(mdPath)) {
          results.push({
            filePath: fullPath,
            mdHref: `/${path.relative(outDir, mdPath)}`,
          });
        }
      }
    }
  }

  walk(outDir);
  return results;
}

function patchSitemapEntry(sitemap: string, siteUrl: string, mdHref: string): string {
  const locBase = `${siteUrl}${mdHref.replace(/\.md$/u, "")}`;
  const mdUrl = `${siteUrl}${mdHref}`;
  const alternateTag = `<xhtml:link rel="alternate" type="text/markdown" href="${mdUrl}"/>`;
  if (sitemap.includes(alternateTag)) {
    return sitemap;
  }
  // Handle both trailing slash and non-trailing slash sitemap formats
  const locTag = [`<loc>${locBase}</loc>`, `<loc>${locBase}/</loc>`].find((v) =>
    sitemap.includes(v),
  );
  if (locTag) {
    return sitemap.replace(locTag, `${locTag}${alternateTag}`);
  }
  return sitemap;
}

async function waitForMdFiles(outDir: string, maxWaitMs: number, intervalMs: number) {
  const deadline = Date.now() + maxWaitMs;
  let results = collectHtmlWithMd(outDir);
  while (results.length === 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    results = collectHtmlWithMd(outDir);
  }
  return results;
}
