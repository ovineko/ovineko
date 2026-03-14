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
      content: () =>
        JSON.stringify({
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
        }) + "\n",
    },
    "eslint.config.js": {
      ...config.init?.["eslint.config.js"],
      content: (context: config.ConfigContext) => {
        const relativePath = tools.Path.rel(context.cwdPath, context.rootPath);

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
      content: () => `packages:
  - apps/*
  - packages/*
  - website
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
packageExtensions:
  # Required for @docusaurus/theme-mermaid -> mermaid -> langium (missing peer deps)
  langium:
    dependencies:
      "@chevrotain/regexp-to-ast": "*"
      vscode-jsonrpc: "*"
      vscode-languageserver-protocol: "*"
      vscode-languageserver-types: "*"
`,
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
