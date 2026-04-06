/// <reference path="./node_modules/@shibanet0/datamitsu-config/dist/datamitsu.config.d.ts" />

function getConfig(config: config.Config) {
  const init: config.MapOfConfigInit = {
    ".oxlintrc.json": {
      ...config.init?.[".oxlintrc.json"],
      content: (context: config.ConfigContext) => {
        const relativePath = tools.Path.rel(context.cwdPath, context.rootPath);
        const previousConfig = JSON.parse(context.existingContent || "");

        if (relativePath === "packages/datamitsu-config") {
          return (
            JSON.stringify(
              {
                ...previousConfig,
                $schema: tools.Path.forImport(
                  tools.Path.join(context.datamitsuDir, "oxlint_configuration_schema.json"),
                ),
                extends: [
                  tools.Path.forImport(tools.Path.join(context.datamitsuDir, ".oxlintrc.json")),
                ],
                rules: {
                  ...previousConfig.rules,
                  "max-statements": "off",
                  "new-cap": "off",
                  "no-duplicate-imports": "off",
                  "typescript/no-extraneous-class": "off",
                  "unicorn/prefer-top-level-await": "off",
                },
              },
              null,
              2,
            ) + "\n"
          );
        }

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
                    "packages/datamitsu-config",
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
      ...config.init?.[".syncpackrc.json"],
      content: (context) => {
        const previousConfig = JSON.parse(context.existingContent || "");

        return (
          JSON.stringify({
            ...previousConfig,
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
                dependencies: ["$LOCAL"],
                dependencyTypes: ["!local"],
                label: "use workspace protocol for local packages",
                pinVersion: "workspace:*",
              },
              {
                dependencies: ["react", "react-dom", "@types/react", "@types/react-dom"],
                isIgnored: true,
                label: "allow website to use its own React version",
                packages: ["website"],
              },
            ],
          }) + "\n"
        );
      },
    },
    "eslint.config.js": {
      ...config.init?.["eslint.config.js"],
      content: (context: config.ConfigContext) => {
        const relativePath = tools.Path.rel(context.cwdPath, context.rootPath);

        const filepath = tools.Path.join(relativePath, "eslint.config.js");

        tools.Hash.assert({
          content: context.existingContent ?? "",
          file: filepath,
          hash:
            filepath === "packages/datamitsu-config/eslint.config.js"
              ? "ed1fb85f639a7c87a9fccbd5d77ddf209f84288561f51baf5c561d46ee8d4c5e"
              : "6c6bed46f1b4d9a154ec0dd71b52647942dac500a63b17cf0ca0d1e6bb27dbfd",
        });

        if (relativePath === "packages/datamitsu-config") {
          return `import { join } from "node:path";

import packageJSON from "./package.json" with { type: "json" };
import { defineConfig } from "./eslint-override-config.js";

export * from "./eslint-override-config.js";

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

import { defineConfig } from "@ovineko/datamitsu-config/eslint-override-config.js";

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
    "pnpm-workspace.yaml": {
      ...config.init?.["pnpm-workspace.yaml"],
      content: (context) => {
        tools.Hash.assert({
          content: context.existingContent ?? "",
          file: "pnpm-workspace.yaml",
          hash: "963a81f680556bacf5a353cfa9845b99cc463654d63947c15f7113a81c1052cd",
        });

        return `packages:
  - apps/*
  - packages/*
  - spa-guard/*
enableGlobalVirtualStore: true
enablePrePostScripts: false
hoistPattern: []
ignorePatchFailures: false
optimisticRepeatInstall: true
resolutionMode: lowest-direct
verifyDepsBeforeRun: install
overrides:
  vite: npm:rolldown-vite@7.2.5
`;
      },
    },
  };

  return {
    ...config,
    init: {
      ...config.init,
      ...init,
    },
  };
}

globalThis.getConfig = getConfig;

const getMinVersion = () => "0.0.0";

globalThis.getMinVersion = getMinVersion;
