/// <reference path="./node_modules/@shibanet0/datamitsu-config/dist/datamitsu.d.ts" />

function getConfig(config: config.Config) {
  const init: config.MapOfConfigInit = {
    ".oxlintrc.json": {
      ...config.init?.[".oxlintrc.json"],
      content: (context: config.ConfigContext) => {
        const relativePath = tools.Path.rel(context.cwdPath, context.rootPath);

        if (relativePath === "packages/datamitsu-config") {
          return `{
  "$schema": "./node_modules/@shibanet0/datamitsu-config/oxlint_configuration_schema.json",
  "extends": ["./node_modules/@shibanet0/datamitsu-config/.oxlintrc.json"],
  "rules": {
    "new-cap": "off",
    "no-duplicate-imports": "off",
    "unicorn/prefer-top-level-await": "off",
    "typescript/no-extraneous-class": "off"
  }
}
`;
        }

        if (context.cwdPath === context.rootPath) {
          return `{
  "$schema": "./node_modules/@shibanet0/datamitsu-config/oxlint_configuration_schema.json",
  "extends": ["./packages/datamitsu-config/.oxlintrc.json"]
}
`;
        }

        return `{
  "$schema": "./node_modules/@shibanet0/datamitsu-config/oxlint_configuration_schema.json",
  "extends": ["../../packages/datamitsu-config/.oxlintrc.json"]
}
`;
      },
    },
    "eslint.config.js": {
      ...config.init?.["eslint.config.js"],
      content: (context: config.ConfigContext) => {
        const relativePath = tools.Path.rel(context.cwdPath, context.rootPath);

        if (relativePath === "packages/datamitsu-config") {
          return `import { join } from "node:path";

import packageJSON from "./package.json" with { type: "json" };
import { defineConfig } from "./eslint-override-config";

export { globalIgnores } from "@shibanet0/datamitsu-config/eslint";

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
enableGlobalVirtualStore: true
enablePrePostScripts: false
hoistPattern: []
ignorePatchFailures: false
optimisticRepeatInstall: true
resolutionMode: lowest-direct
verifyDepsBeforeRun: install
overrides:
  vite: npm:rolldown-vite@7.2.5
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
