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

  const processedOptions = { ...options, trace: undefined };

  if (processedOptions.fallback?.html) {
    processedOptions.fallback = {
      ...processedOptions.fallback,
      html: await minifyHtml(processedOptions.fallback.html),
    };
  }

  return `window.${optionsWindowKey}=${JSON.stringify(processedOptions).replaceAll("<", "\\u003c")};${script}`;
};

export const spaGuardVitePlugin = (options: VitePluginOptions = {}): Plugin => {
  let packageVersion: string | undefined;

  return {
    configResolved: async (config) => {
      if (!options.version) {
        try {
          const packageJsonPath = path.join(config.root, "package.json");
          const packageJson = JSON.parse(await fsPromise.readFile(packageJsonPath, "utf8"));
          packageVersion = packageJson.version;
        } catch {
          // package.json may not exist or may not have a version field
        }
      }
    },
    name: `${name}/vite-plugin`,
    transformIndexHtml: {
      handler: async (html) => {
        const finalOptions: VitePluginOptions = {
          ...options,
          version: options.version ?? packageVersion,
        };

        const inlineScript = await getInlineScript(finalOptions);

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
