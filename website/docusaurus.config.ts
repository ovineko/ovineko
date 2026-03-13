import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  baseUrl: "/",
  favicon: "img/favicon.ico",
  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
    mermaid: true,
  },

  onBrokenAnchors: "throw",
  onBrokenLinks: "throw",
  organizationName: "ovineko",

  presets: [
    [
      "classic",
      {
        blog: false,
        docs: {
          editUrl: "https://github.com/ovineko/ovineko/tree/main/website/",
          sidebarPath: "./sidebars.ts",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  projectName: "ovineko",

  tagline: "Tools born from friction. Solutions that stay.",

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    footer: {
      copyright: `Copyright © ${new Date().getFullYear()} Ovineko. A quiet guardian at the threshold.`,
      links: [
        {
          items: [
            {
              label: "Introduction",
              to: "/docs/intro",
            },
            {
              label: "Philosophy",
              to: "/docs/philosophy",
            },
          ],
          title: "Docs",
        },
        {
          items: [
            {
              href: "https://github.com/ovineko/ovineko",
              label: "GitHub",
            },
            {
              href: "https://www.npmjs.com/org/ovineko",
              label: "npm",
            },
            {
              href: "https://npmx.dev/org/ovineko",
              label: "npmx",
            },
          ],
          title: "More",
        },
      ],
      style: "dark",
    },
    mermaid: {
      theme: { dark: "dark", light: "neutral" },
    },
    navbar: {
      items: [
        {
          label: "Docs",
          position: "left",
          sidebarId: "docsSidebar",
          type: "docSidebar",
        },
        {
          href: "https://github.com/ovineko/ovineko",
          label: "GitHub",
          position: "right",
        },
      ],
      logo: {
        alt: "Ovineko Logo",
        src: "img/logo.svg",
      },
      title: "Ovineko",
    },
    prism: {
      darkTheme: prismThemes.vsDark,
      theme: prismThemes.vsLight,
    },
  } satisfies Preset.ThemeConfig,

  themes: ["@docusaurus/theme-mermaid"],

  title: "Ovineko",

  // Set the production url of your site here
  url: "https://ovineko.com",
};

export default config;
