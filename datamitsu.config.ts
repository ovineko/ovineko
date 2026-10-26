/// <reference path="./.datamitsu/datamitsu.config.d.ts" />

// Project layer on top of the default @shibanet0/datamitsu-config. The engine loads the
// upstream config first and passes its output here as `config`; this function overrides
// only what the monorepo needs and leaves every other managed file to the upstream layer.

const DATAMITSU_CONFIG_PACKAGE = "packages/datamitsu-config";

function getConfig(config: config.Config): config.Config {
  const baseManagedConfigs = config.managedConfigs ?? {};

  const managedConfigs: config.MapOfManagedConfigs = {
    ...baseManagedConfigs,
    "oxlint.config.mts": {
      ...baseManagedConfigs["oxlint.config.mts"],
      content: (context) => {
        const importPath = tools.Path.forImport(
          tools.Path.join(
            tools.Path.rel(context.rootPath, context.cwdPath),
            DATAMITSU_CONFIG_PACKAGE,
            "oxlint-override-config.mjs",
          ),
        );

        return `import { defineConfig } from "${importPath}";
import packageJSON from "./package.json" with { type: "json" };

export default defineConfig(packageJSON);
`;
      },
    },
    ".syncpackrc.json": {
      ...baseManagedConfigs[".syncpackrc.json"],
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
      ...baseManagedConfigs["eslint.config.mjs"],
      content: (context) => {
        const importPath = tools.Path.forImport(
          tools.Path.join(
            tools.Path.rel(context.rootPath, context.cwdPath),
            DATAMITSU_CONFIG_PACKAGE,
            "eslint-override-config.mjs",
          ),
        );

        return `import { defineConfig } from "${importPath}";
import packageJSON from "./package.json" with { type: "json" };

export default await defineConfig(
  /** @type {import("@shibanet0/datamitsu-config/type-fest").PackageJson} */ (packageJSON),
);
`;
      },
    },
  };

  return { ...config, managedConfigs };
}

globalThis.getConfig = getConfig;

function getMinVersion(): string {
  return "0.1.9";
}

globalThis.getMinVersion = getMinVersion;
