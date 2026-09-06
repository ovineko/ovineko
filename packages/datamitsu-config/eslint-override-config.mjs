import { defineConfig as defineConfigLib } from "../../.datamitsu/eslint.config.mjs";

export { globalIgnores } from "../../.datamitsu/eslint.config.mjs";

/**
 * Rules turned off for every package in the monorepo.
 */
const sharedRules = {
  "perfectionist/sort-imports": "off",
  "perfectionist/sort-objects": "off",
  "sonarjs/no-identical-functions": "off",
  "unicorn/prefer-top-level-await": "off",
};

/**
 * Per-package rule overrides, keyed by package.json `name`. They live here and not in the
 * per-package eslint.config.mjs files, which datamitsu generates and owns.
 */
const packageRules = {
  "@ovineko/docusaurus-config": {
    "unicorn/no-loop-iterable-mutation": "off",
    "unicorn/no-negated-array-predicate": "off",
  },
  "@ovineko/spa-guard": {
    "unicorn/no-unnecessary-splice": "off",
    "unicorn/prefer-dom-node-html-methods": "off",
    "unicorn/prefer-object-define-properties": "off",
    "unicorn/prefer-object-iterable-methods": "off",
    "unicorn/prefer-promise-try": "off",
    "unicorn/prefer-unicode-code-point-escapes": "off",
    "unicorn/require-css-escape": "off",
  },
  "@ovineko/spa-guard-node": {
    // The inline entries are injected into HTML as a <script>; the IIFE is their isolation
    // wrapper, not incidental scoping.
    "unicorn/no-useless-coercion": "off",
    "unicorn/prefer-block-statement-over-iife": "off",
    "unicorn/prefer-unicode-code-point-escapes": "off",
  },
  "@ovineko/spa-guard-react": {
    "unicorn/prefer-dom-node-html-methods": "off",
    "unicorn/require-css-escape": "off",
  },
};

/**
 * @type {typeof defineConfigLib}
 */
export const defineConfig = async (packageJSON, config = [], options) => {
  const _config = await defineConfigLib(
    packageJSON,
    [
      {
        rules: {
          ...sharedRules,
          ...packageRules[packageJSON.name],
        },
      },
      ...config,
    ],
    {
      ...options,
      plugins: {
        i18next: {
          disabled: true,
        },
        playwright: {
          disabled: true,
        },
        ...options?.plugins,
      },
    },
  );

  return [
    ..._config,
    ...(config || []),
    {
      // `.mjs` is ESM by definition, regardless of package.json `type`. Packages that omit
      // `"type": "module"` (website) would otherwise parse their own .mjs configs as scripts.
      files: ["**/*.mjs"],
      languageOptions: { sourceType: "module" },
    },
  ];
};
