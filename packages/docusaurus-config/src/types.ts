import type { PluginOptions as IdealImageOptions } from "@docusaurus/plugin-ideal-image";
import type { PluginOptions as LlmsOptions } from "docusaurus-plugin-llms";

export type { PluginOptions as IdealImageOptions } from "@docusaurus/plugin-ideal-image";
export type { PluginOptions as LlmsOptions } from "docusaurus-plugin-llms";

export interface MarkdownAlternateOptions {
  intervalMs?: number;
  maxWaitMs?: number;
}

export interface OvinekoDocsOptions {
  /** docusaurus-plugin-copy-page-button. Default: true */
  copyPageButton?: boolean;

  /** Docusaurus future flags { faster: true, v4: true }. Default: true */
  future?: boolean | Record<string, boolean>;

  /** @docusaurus/plugin-ideal-image. Default: false (requires sharp native module) */
  idealImage?: boolean | IdealImageOptions;

  /** docusaurus-plugin-llms + <link rel="alternate" href="/llms.txt"/> headTag. Default: true */
  llms?: boolean | LlmsOptions;

  /** Per-page <link rel="alternate" type="text/markdown"> + sitemap patching. Default: true */
  markdownAlternate?: boolean | MarkdownAlternateOptions;

  /** Umami analytics. Only injected in production. Default: disabled */
  umami?: false | UmamiOptions;
}

export interface UmamiOptions {
  src: string;
  websiteId: string;
}
