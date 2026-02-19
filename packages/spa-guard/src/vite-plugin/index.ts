import type { Plugin } from "vite";

import fsPromise from "node:fs/promises";
import path from "node:path";

import { name } from "../../package.json";
import { type Options, optionsWindowKey } from "../common/options";

const getInlineScript = async (options: Options) => {
  const script = await fsPromise
    .readFile(path.join(import.meta.dirname, "../dist-inline/index.js"), "utf8")
    .then((r) => r.trim());

  return `window.${optionsWindowKey}=${JSON.stringify(options)};${script}`;
};

export const spaGuardVitePlugin = (options: Options): Plugin => {
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
