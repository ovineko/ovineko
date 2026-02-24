import type { Options } from "@ovineko/spa-guard/_internal";

import { defaultSpinnerSvg, optionsWindowKey, SPINNER_ID } from "@ovineko/spa-guard/_internal";
import { minify } from "html-minifier-terser";
import crypto from "node:crypto";
import fsPromise from "node:fs/promises";
import path from "node:path";

export interface BuildExternalScriptOptions extends BuildScriptOptions {
  /** Directory to write the script file to */
  outDir: string;
  /** Public path prefix for the generated URL (default: '/') */
  publicPath?: string;
}

export interface BuildExternalScriptResult {
  /** The written file name (e.g., 'spa-guard.abc12345.js') */
  fileName: string;
  /** Ready-to-inject HTML strings, one per tag */
  html: string[];
  /** The public URL for the script */
  publicUrl: string;
  /** Structured tag descriptors */
  tags: HtmlTagDescriptor[];
}

export interface BuildScriptOptions extends Options {
  trace?: boolean;
}

export interface BuildScriptResult {
  /** SHA-256 hex digest (first 16 chars) of the script content */
  hash: string;
  /** Ready-to-inject HTML strings, one per tag */
  html: string[];
  /** The full inline script string */
  scriptContent: string;
  /** Structured tag descriptors for HTML injection */
  tags: HtmlTagDescriptor[];
}

export interface HtmlTagDescriptor {
  attrs?: Record<string, string>;
  children?: string;
  injectTo: "body" | "body-prepend" | "head" | "head-prepend";
  tag: string;
}

const minifyHtml = async (html: string): Promise<string> => {
  return await minify(html, {
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
  });
};

/** Resolve and normalise options, generating a version if absent. */
const resolveFinalOptions = (options: BuildScriptOptions): BuildScriptOptions => {
  const finalOptions: BuildScriptOptions = {
    ...options,
    version: options.version ?? crypto.randomUUID(),
  };

  const spinnerOpts = options.spinner;
  if (spinnerOpts?.disabled !== true) {
    const spinnerContent = spinnerOpts?.content ?? defaultSpinnerSvg;
    const bg = spinnerOpts?.background ?? "#fff";
    finalOptions.spinner = { ...spinnerOpts, background: bg, content: spinnerContent };
  }

  return finalOptions;
};

/** Build the raw inline script string from resolved options. */
const buildRawScript = async (finalOptions: BuildScriptOptions): Promise<string> => {
  const buildDir = finalOptions.trace ? "dist-inline-trace" : "dist-inline";

  const script = await fsPromise
    .readFile(path.join(import.meta.dirname, `../${buildDir}/index.js`), "utf8")
    .then((r) => r.trim());

  const processedOptions: BuildScriptOptions = { ...finalOptions, trace: undefined };

  if (processedOptions.html?.fallback?.content) {
    processedOptions.html = {
      ...processedOptions.html,
      fallback: {
        ...processedOptions.html.fallback,
        content: await minifyHtml(processedOptions.html.fallback.content),
      },
    };
  }

  const escapedJson = JSON.stringify(processedOptions).replaceAll("<", "\\u003c");
  const safeVersion = JSON.stringify(processedOptions.version).replaceAll("<", "\\u003c");

  return `window.__SPA_GUARD_VERSION__=${safeVersion};window.${optionsWindowKey}=${escapedJson};${script}`;
};

const tagToHtml = (tag: HtmlTagDescriptor): string => {
  const attrs = tag.attrs
    ? Object.entries(tag.attrs)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("")
    : "";
  return `<${tag.tag}${attrs}>${tag.children ?? ""}</${tag.tag}>`;
};

const buildSpinnerTags = (
  options: BuildScriptOptions,
  finalOptions: BuildScriptOptions,
): HtmlTagDescriptor[] => {
  if (options.spinner?.disabled === true) {
    return [];
  }

  const bg = finalOptions.spinner?.background ?? "#fff";
  const spinnerContent = finalOptions.spinner?.content ?? defaultSpinnerSvg;

  const tags: HtmlTagDescriptor[] = [
    {
      attrs: {
        id: SPINNER_ID,
        style: `position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--spa-guard-spinner-bg,${bg})`,
      },
      children: spinnerContent,
      injectTo: "body-prepend",
      tag: "div",
    },
    {
      children: "document.body.style.overflow='hidden'",
      injectTo: "body-prepend",
      tag: "script",
    },
  ];

  if (bg !== "#fff") {
    tags.push({
      children: `:root{--spa-guard-spinner-bg:${bg}}`,
      injectTo: "head",
      tag: "style",
    });
  }

  return tags;
};

/**
 * Build the spa-guard script as an external file with a content-hashed filename.
 *
 * Calls buildSpaGuardScript internally, writes the script to outDir with a content-hashed
 * filename (e.g., spa-guard.abc12345.js), and returns the public URL and tag descriptors
 * for a <script src="..."> tag.
 */
export async function buildExternalScript(
  options: BuildExternalScriptOptions,
): Promise<BuildExternalScriptResult> {
  const { outDir, publicPath = "/", ...scriptOptions } = options;

  const finalOptions = resolveFinalOptions(scriptOptions);
  const scriptContent = await buildRawScript(finalOptions);
  const hash = crypto.createHash("sha256").update(scriptContent).digest("hex").slice(0, 16);
  const fileName = `spa-guard.${hash}.js`;
  const filePath = path.join(outDir, fileName);

  await fsPromise.mkdir(outDir, { recursive: true });
  await fsPromise.writeFile(filePath, scriptContent, "utf8");

  const normalizedPublicPath = publicPath.endsWith("/") ? publicPath : `${publicPath}/`;
  const publicUrl = `${normalizedPublicPath}${fileName}`;

  const scriptTag: HtmlTagDescriptor = {
    attrs: { src: publicUrl },
    injectTo: "head-prepend",
    tag: "script",
  };

  const tags: HtmlTagDescriptor[] = [scriptTag, ...buildSpinnerTags(scriptOptions, finalOptions)];
  const html = tags.map((t) => tagToHtml(t));

  return { fileName, html, publicUrl, tags };
}

/**
 * Build the spa-guard inline script with processed options and content hash.
 *
 * Reads the pre-built inline script from dist-inline/ (or dist-inline-trace/ if trace: true),
 * processes options (minifies fallback HTML, escapes JSON), generates a SHA-256 content hash,
 * and returns the script content, hash, HTML strings, and structured tag descriptors.
 *
 * Version defaults to crypto.randomUUID() if not provided.
 */
export async function buildSpaGuardScript(
  options: BuildScriptOptions = {},
): Promise<BuildScriptResult> {
  const finalOptions = resolveFinalOptions(options);
  const scriptContent = await buildRawScript(finalOptions);
  const hash = crypto.createHash("sha256").update(scriptContent).digest("hex").slice(0, 16);

  const scriptTag: HtmlTagDescriptor = {
    children: scriptContent,
    injectTo: "head-prepend",
    tag: "script",
  };

  const tags: HtmlTagDescriptor[] = [scriptTag, ...buildSpinnerTags(options, finalOptions)];
  const html = tags.map((t) => tagToHtml(t));

  return { hash, html, scriptContent, tags };
}
