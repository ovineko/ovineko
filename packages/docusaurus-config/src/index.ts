import type { Config, HtmlTagObject, PluginConfig } from "@docusaurus/types";

import { createRequire } from "node:module";

import { appendArray, appendPlugins } from "./merge.js";
import markdownAlternatePlugin from "./plugins/markdown-alternate.js";

const require = createRequire(import.meta.url);
import type { IdealImageOptions, LlmsOptions, OvinekoDocsOptions } from "./types.js";

export type {
  IdealImageOptions,
  LlmsOptions,
  MarkdownAlternateOptions,
  OvinekoDocsOptions,
} from "./types.js";

const DEFAULT_LLMS: LlmsOptions = {
  excludeImports: true,
  generateLLMsFullTxt: true,
  generateLLMsTxt: true,
  generateMarkdownFiles: true,
  removeDuplicateHeadings: true,
};

const DEFAULT_IDEAL_IMAGE: IdealImageOptions = {
  disableInDev: false,
  max: 1030,
  min: 640,
  quality: 70,
  steps: 2,
};

export function withOvinekoDocs(config: Config, options: OvinekoDocsOptions = {}): Config {
  const {
    copyPageButton = true,
    future = true,
    idealImage = false,
    llms = true,
    markdownAlternate = true,
    umami = false,
  } = options;

  const pluginsToAdd: PluginConfig[] = [];
  const headTagsToAdd: HtmlTagObject[] = [];
  const scriptsToAdd: NonNullable<Config["scripts"]> = [];

  // Future flags
  const futureConfig =
    future !== false
      ? {
          ...(typeof future === "object" ? future : { faster: true, v4: true }),
          ...config.future,
        }
      : config.future;

  // llms plugin + headTag
  if (llms !== false) {
    const llmsConfig = typeof llms === "object" ? llms : DEFAULT_LLMS;
    pluginsToAdd.push([
      require.resolve("docusaurus-plugin-llms"),
      llmsConfig as Record<string, unknown>,
    ]);
    headTagsToAdd.push({
      attributes: {
        href: "/llms.txt",
        rel: "alternate",
        title: "LLMs.txt",
        type: "text/markdown",
      },
      tagName: "link",
    });
  }

  // Copy page button
  if (copyPageButton) {
    pluginsToAdd.push(require.resolve("docusaurus-plugin-copy-page-button"));
  }

  // Markdown alternate (per-page <link rel="alternate"> + sitemap)
  if (markdownAlternate !== false) {
    const mdAltOptions = typeof markdownAlternate === "object" ? markdownAlternate : {};
    pluginsToAdd.push([markdownAlternatePlugin, mdAltOptions] as unknown as PluginConfig);
  }

  // Ideal image
  if (idealImage !== false) {
    const imgConfig = typeof idealImage === "object" ? idealImage : DEFAULT_IDEAL_IMAGE;
    pluginsToAdd.push([
      require.resolve("@docusaurus/plugin-ideal-image"),
      imgConfig as Record<string, unknown>,
    ]);
  }

  // Umami analytics (production only)
  if (umami && process.env.NODE_ENV === "production") {
    scriptsToAdd.push({
      async: true,
      "data-website-id": umami.websiteId,
      src: umami.src,
    });
  }

  return {
    ...config,
    ...(futureConfig ? { future: futureConfig } : {}),
    headTags: appendArray(config.headTags as HtmlTagObject[], headTagsToAdd),
    plugins: appendPlugins((config.plugins ?? []) as PluginConfig[], pluginsToAdd),
    scripts: appendArray(config.scripts as NonNullable<Config["scripts"]>, scriptsToAdd),
  } as Config;
}
