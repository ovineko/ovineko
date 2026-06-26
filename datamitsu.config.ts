/// <reference path="./.datamitsu/datamitsu.config.d.ts" />

// Project layer on top of the default @shibanet0/datamitsu-config. The engine loads the
// upstream config first and passes its output here as `config`; this function overrides
// only what the monorepo needs and leaves every other managed file to the upstream layer.

const DATAMITSU_CONFIG_PACKAGE = "packages/datamitsu-config";

// @ovineko/datamitsu-config is itself a config package, so a handful of rules that the
// shared preset enforces don't make sense for its own source.
const datamitsuConfigOxlintRules: Record<string, "off"> = {
  "max-statements": "off",
  "new-cap": "off",
  "no-duplicate-imports": "off",
  "no-shadow": "off",
  "typescript/no-extraneous-class": "off",
  "unicorn/prefer-top-level-await": "off",
};

function getConfig(config: config.Config): config.Config {
  const baseSetup = config.setup ?? {};

  const setup: config.MapOfConfigSetup = {
    ...baseSetup,
    ".oxlintrc.json": {
      ...baseSetup[".oxlintrc.json"],
      content: (context) => {
        // packages/datamitsu-config owns the single oxlint ruleset for the whole monorepo: it
        // extends the upstream preset and relaxes a few rules. Every other package extends THIS
        // file (not the upstream preset directly) so the categories and disables are shared once
        // instead of re-derived per package.
        if (tools.Path.rel(context.cwdPath, context.rootPath) === DATAMITSU_CONFIG_PACKAGE) {
          const base =
            baseSetup[".oxlintrc.json"]?.content?.(context) ?? context.originalContent ?? "{}";
          const parsed = JSON.parse(base);

          return (
            JSON.stringify(
              { ...parsed, rules: { ...parsed.rules, ...datamitsuConfigOxlintRules } },
              null,
              2,
            ) + "\n"
          );
        }

        const previousConfig = JSON.parse(context.originalContent || "{}");

        return (
          JSON.stringify(
            {
              $schema: tools.Path.forImport(
                tools.Path.join(context.datamitsuDir, "oxlint_configuration_schema.json"),
              ),
              extends: [
                tools.Path.forImport(
                  tools.Path.join(
                    tools.Path.rel(context.rootPath, context.cwdPath),
                    DATAMITSU_CONFIG_PACKAGE,
                    ".oxlintrc.json",
                  ),
                ),
              ],
              rules: previousConfig.rules,
            },
            null,
            2,
          ) + "\n"
        );
      },
    },
    ".syncpackrc.json": {
      ...baseSetup[".syncpackrc.json"],
      content: () => {
        return (
          JSON.stringify(
            {
              semverGroups: [
                {
                  dependencies: ["**"],
                  dependencyTypes: ["peer"],
                  label: "use caret range for all peerDependencies",
                  packages: ["**"],
                  range: "^",
                },
                {
                  dependencies: ["**"],
                  dependencyTypes: ["!peer", "!local"],
                  label: "use exact versions for regular dependencies",
                  packages: ["**"],
                  range: "",
                },
              ],
              versionGroups: [
                {
                  dependencies: ["eslint"],
                  dependencyTypes: ["peer"],
                  label: "spa-guard-eslint supports eslint v9 and v10",
                  packages: ["@ovineko/spa-guard-eslint"],
                  pinVersion: "^9 || ^10",
                },
                {
                  dependencies: ["fastify", "fastify-plugin"],
                  dependencyTypes: ["peer"],
                  label: "spa-guard-fastify supports fastify v4 and v5",
                  packages: ["@ovineko/spa-guard-fastify"],
                  pinVersion: "^5 || ^4",
                },
                {
                  dependencies: ["vite"],
                  dependencyTypes: ["peer"],
                  label: "spa-guard-vite supports vite v7 and v8",
                  packages: ["@ovineko/spa-guard-vite"],
                  pinVersion: "^8 || ^7",
                },
                {
                  dependencies: ["@docusaurus/types"],
                  dependencyTypes: ["peer"],
                  label: "docusaurus-config supports docusaurus v3",
                  packages: ["@ovineko/docusaurus-config"],
                  pinVersion: "^3",
                },
                {
                  dependencies: ["$LOCAL"],
                  dependencyTypes: ["!local"],
                  label: "use workspace protocol for local packages",
                  pinVersion: "workspace:*",
                },
                {
                  dependencies: ["react", "react-dom", "@types/react", "@types/react-dom"],
                  dependencyTypes: ["peer"],
                  label: "react peer dependency uses >=18 range",
                  packages: ["**"],
                  pinVersion: ">=18",
                },
                {
                  dependencies: ["react", "react-dom", "@types/react", "@types/react-dom"],
                  isIgnored: true,
                  label: "allow website to use its own React version",
                  packages: ["website"],
                },
              ],
            },
            null,
            2,
          ) + "\n"
        );
      },
      scope: "git-root",
    },
    "eslint.config.mjs": {
      ...baseSetup["eslint.config.mjs"],
      content: (context) => {
        // Every package consumes @ovineko/datamitsu-config's defineConfig wrapper instead of
        // the upstream preset directly. The config package itself can't import by its own name,
        // so it self-references the wrapper via a relative path and re-exports it.
        if (tools.Path.rel(context.cwdPath, context.rootPath) === DATAMITSU_CONFIG_PACKAGE) {
          return `import { join } from "node:path";

import packageJSON from "./package.json" with { type: "json" };
import { defineConfig } from "./eslint-override-config.mjs";

export * from "./eslint-override-config.mjs";

export default defineConfig(
  /** @type {import('@shibanet0/datamitsu-config/type-fest').PackageJson} */ (packageJSON),
  undefined,
  {
    plugins: {
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
    },
  },
)
`;
        }

        return `import { join } from "node:path";

import { defineConfig } from "@ovineko/datamitsu-config/eslint-override-config.mjs";

import packageJSON from "./package.json" with { type: "json" };

const config = await defineConfig(
  /** @type {import('@shibanet0/datamitsu-config/type-fest').PackageJson} */ (packageJSON),
  undefined,
  {
    plugins: {
      oxlint: {
        configFilePath: join(import.meta.dirname, ".oxlintrc.json"),
      },
    },
  },
);

export default config;
`;
      },
    },
  };

  return { ...config, setup };
}

globalThis.getConfig = getConfig;

function getMinVersion(): string {
  return "0.1.9";
}

globalThis.getMinVersion = getMinVersion;
