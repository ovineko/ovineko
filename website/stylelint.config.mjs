import { defineConfig } from "../.datamitsu/stylelint.config.mjs";

export default defineConfig({
  overrides: [
    {
      files: ["**/*.module.css"],
      rules: {
        "selector-class-pattern": null,
        "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }],
      },
    },
    {
      files: ["src/css/**/*.css"],
      rules: {
        "selector-class-pattern": null,
      },
    },
  ],
});
