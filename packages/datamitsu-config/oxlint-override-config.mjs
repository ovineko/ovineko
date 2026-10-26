import { defineConfig as defineConfigLib } from "../../.datamitsu/oxlint.config.js";

const datamitsuConfigOxlintRules = {
  "max-statements": "off",
  "new-cap": "off",
  "no-duplicate-imports": "off",
  "no-shadow": "off",
  "typescript/no-extraneous-class": "off",
  "unicorn/prefer-top-level-await": "off",
};

export const defineConfig = (packageJSON) =>
  defineConfigLib(packageJSON, {
    ...(packageJSON.name === "@ovineko/datamitsu-config" && {
      rules: datamitsuConfigOxlintRules,
    }),
    ...(packageJSON.name === "@ovineko/spa-guard" && {
      overrides: [
        {
          files: ["**/*.test.ts"],
          rules: {
            // Vitest assertions inspect mock methods without calling them; Oxlint lacks a test-aware variant.
            "typescript/unbound-method": "off",
          },
        },
      ],
    }),
  });
