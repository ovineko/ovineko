import { defineConfig as defineConfigLib } from "@shibanet0/datamitsu-config/eslint";

export { globalIgnores } from "@shibanet0/datamitsu-config/eslint";

/**
 * @type {typeof defineConfigLib}
 */
export const defineConfig = async (packageJSON, config = [], options = {}) => {
  const _config = await defineConfigLib(
    packageJSON,
    [
      {
        rules: {
          "react-perf/jsx-no-new-function-as-prop": "off",
          "sonarjs/no-identical-functions": "off",
          "unicorn/prefer-top-level-await": "off",
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

  return [..._config, ...(config || [])];
};
