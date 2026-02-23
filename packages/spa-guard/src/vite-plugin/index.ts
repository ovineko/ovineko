import type { HtmlTagDescriptor, Plugin } from "vite";

import { minify } from "html-minifier-terser";
import crypto from "node:crypto";
import fsPromise from "node:fs/promises";
import path from "node:path";

import { name } from "../../package.json";
import { type Options, optionsWindowKey } from "../common/options";
import { defaultSpinnerSvg, SPINNER_ID } from "../common/spinner";

export interface VitePluginOptions extends Options {
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

  const script = await fsPromise
    .readFile(path.join(import.meta.dirname, `../../${buildDir}/index.js`), "utf8")
    .then((r) => r.trim());

  const processedOptions = { ...options, trace: undefined };

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

  return `window.__SPA_GUARD_VERSION__="${processedOptions.version}";window.${optionsWindowKey}=${escapedJson};${script}`;
};

export const spaGuardVitePlugin = (options: VitePluginOptions = {}): Plugin => {
  const autoVersion = crypto.randomUUID();

  return {
    name: `${name}/vite-plugin`,
    transformIndexHtml: {
      handler: async (html) => {
        const finalOptions: VitePluginOptions = {
          ...options,
          version: options.version ?? autoVersion,
        };

        const spinnerOpts = finalOptions.spinner;
        if (spinnerOpts?.disabled !== true) {
          const spinnerContent = spinnerOpts?.content ?? defaultSpinnerSvg;
          const bg = spinnerOpts?.background ?? "#fff";

          finalOptions.spinner = { ...spinnerOpts, background: bg, content: spinnerContent };
        }

        const inlineScript = await getInlineScript(finalOptions);

        const tags: HtmlTagDescriptor[] = [
          {
            children: inlineScript,
            injectTo: "head-prepend",
            tag: "script",
          },
        ];

        if (spinnerOpts?.disabled !== true) {
          const bg = finalOptions.spinner?.background ?? "#fff";
          const spinnerContent = finalOptions.spinner?.content ?? defaultSpinnerSvg;

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
  };
};
