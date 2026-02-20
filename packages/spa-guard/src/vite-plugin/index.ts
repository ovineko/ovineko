import type { Plugin } from "vite";

import { minify } from "html-minifier-terser";
import fsPromise from "node:fs/promises";
import path from "node:path";

import { name } from "../../package.json";
import { type Options, optionsWindowKey } from "../common/options";

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

  const processedOptions = { ...options };

  if (processedOptions.fallback?.html) {
    processedOptions.fallback = {
      ...processedOptions.fallback,
      html: await minifyHtml(processedOptions.fallback.html),
    };
  }

  return `window.${optionsWindowKey}=${JSON.stringify(processedOptions)};${script}`;
};

export const spaGuardVitePlugin = (options: VitePluginOptions = {}): Plugin => {
  return {
    name: `${name}/vite-plugin`,
    transformIndexHtml: {
      handler: async (html) => {
        const inlineScript = await getInlineScript(options);

        return {
          html,
          tags: [
            {
              children: inlineScript,
              injectTo: "head-prepend",
              tag: "script",
            },
          ],
        };
      },
      order: "post",
    },
  };
};
