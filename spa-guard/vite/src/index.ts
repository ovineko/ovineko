import type { HtmlTagDescriptor, Plugin, ViteDevServer } from "vite";

import { type Options, optionsWindowKey } from "@ovineko/spa-guard/_internal";
import { defaultSpinnerSvg, SPINNER_ID } from "@ovineko/spa-guard/_internal";
import { minify } from "html-minifier-terser";
import crypto from "node:crypto";
import fsPromise from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { name } from "../package.json";

export interface VitePluginOptions extends Options {
  /** Directory to write the external script file (defaults to vite's build.outDir). */
  externalScriptDir?: string;
  /** Script injection mode. 'inline' (default) embeds the script; 'external' writes a content-hashed file. */
  mode?: "external" | "inline";
  /** Public URL prefix for the external script (defaults to '/'). */
  publicPath?: string;
  trace?: boolean;
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

const getInlineScript = async (options: VitePluginOptions) => {
  const buildDir = options.trace ? "dist-inline-trace" : "dist-inline";

  const nodePackageJsonUrl = import.meta.resolve("@ovineko/spa-guard-node/package.json");
  const nodePackageDir = path.dirname(fileURLToPath(nodePackageJsonUrl));

  const script = await fsPromise
    .readFile(path.join(nodePackageDir, buildDir, "index.js"), "utf8")
    .then((r) => r.trim());

  const processedOptions = {
    ...options,
    externalScriptDir: undefined,
    mode: undefined,
    publicPath: undefined,
    trace: undefined,
  };

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

export const spaGuardVitePlugin = (options: VitePluginOptions = {}): Plugin => {
  const autoVersion = crypto.randomUUID();
  const { mode = "inline" } = options;

  let resolvedOutDir: null | string = null;
  let resolvedBase: null | string = null;
  let cachedExternalContent: null | string = null;
  let cachedExternalHash: null | string = null;
  let cachedExternalFileName: null | string = null;
  let cachedExternalPublicPath: null | string = null;

  return {
    configResolved(config) {
      resolvedBase = config.base ?? null;
      if (mode === "external") {
        resolvedOutDir = options.externalScriptDir ?? config.build.outDir;
      }
    },

    configureServer(server: ViteDevServer) {
      if (mode !== "external") {
        return;
      }
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split("?")[0];
        if (cachedExternalPublicPath && requestPath === cachedExternalPublicPath) {
          res.setHeader("Content-Type", "application/javascript");
          res.end(cachedExternalContent);
          return;
        }
        next();
      });
    },

    name: `${name}/vite-plugin`,

    transformIndexHtml: {
      handler: async (html) => {
        const finalOptions: VitePluginOptions = {
          ...options,
          version: options.version ?? autoVersion,
        };

        const spinnerOpts = finalOptions.html?.spinner;
        if (spinnerOpts?.disabled !== true) {
          const spinnerContent = spinnerOpts?.content ?? defaultSpinnerSvg;
          const bg = spinnerOpts?.background ?? "#fff";

          finalOptions.html = {
            ...finalOptions.html,
            spinner: { ...spinnerOpts, background: bg, content: spinnerContent },
          };
        }

        let mainTag: HtmlTagDescriptor;

        if (mode === "external") {
          if (!cachedExternalContent) {
            const rawScript = await getInlineScript(finalOptions);
            const hash = crypto.createHash("sha256").update(rawScript).digest("hex").slice(0, 16);
            cachedExternalContent = rawScript;
            cachedExternalHash = hash;
            cachedExternalFileName = `spa-guard.${hash}.js`;
          }

          const publicPath = options.publicPath ?? resolvedBase ?? "/";
          const normalizedPath = publicPath.endsWith("/") ? publicPath : `${publicPath}/`;
          const publicUrl = `${normalizedPath}spa-guard.${cachedExternalHash}.js`;
          cachedExternalPublicPath = publicUrl;

          mainTag = {
            attrs: { src: publicUrl },
            injectTo: "head-prepend",
            tag: "script",
          };
        } else {
          const inlineScript = await getInlineScript(finalOptions);

          mainTag = {
            children: inlineScript,
            injectTo: "head-prepend",
            tag: "script",
          };
        }

        const tags: HtmlTagDescriptor[] = [mainTag];

        if (finalOptions.html?.spinner?.disabled !== true) {
          const bg = finalOptions.html?.spinner?.background ?? "#fff";
          const spinnerContent = finalOptions.html?.spinner?.content ?? defaultSpinnerSvg;

          tags.push({
            attrs: {
              id: SPINNER_ID,
              style: `position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:var(--spa-guard-spinner-bg,${bg})`,
            },
            children: spinnerContent,
            injectTo: "body-prepend",
            tag: "div",
          });

          tags.push({
            children: "document.body.style.overflow='hidden'",
            injectTo: "body-prepend",
            tag: "script",
          });

          if (bg !== "#fff") {
            tags.push({
              children: `:root{--spa-guard-spinner-bg:${bg}}`,
              injectTo: "head",
              tag: "style",
            });
          }
        }

        return { html, tags };
      },
      order: "post",
    },

    async writeBundle() {
      if (
        mode === "external" &&
        cachedExternalContent &&
        cachedExternalFileName &&
        resolvedOutDir
      ) {
        await fsPromise.mkdir(resolvedOutDir, { recursive: true });
        await fsPromise.writeFile(
          path.join(resolvedOutDir, cachedExternalFileName),
          cachedExternalContent,
          "utf8",
        );
      }
    },
  };
};
