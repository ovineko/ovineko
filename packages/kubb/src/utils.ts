import { camelCase } from "change-case";

import type { PluginOptions } from "./types";

export const createPluginOptions = <T = unknown>(
  options: T,
  optionsPlugin: PluginOptions<T> | undefined,
): T => {
  if (optionsPlugin?.createOptions) {
    return optionsPlugin.createOptions(options);
  }
  return options;
};

export const defaultDisabledEslintRules: string[] = [
  "perfectionist/sort-object-types",
  "perfectionist/sort-objects",
  "perfectionist/sort-named-imports",
  "sonarjs/redundant-type-aliases",
  "perfectionist/sort-modules",
  "unicorn/no-instanceof-builtins",
  "sonarjs/no-redundant-jump",
  "@typescript-eslint/consistent-type-imports",
  "perfectionist/sort-union-types",
];

export const getDefaultOutputBanner = (disabledEslintRules: string[]): string =>
  [`/* eslint-disable ${disabledEslintRules.join(", ")} */`, "/* tslint:disable */", ""].join("\n");

export const defaultOutputFooter: string = [""].join("\n");

export const fixGroupName = (options: { plugin: string; suffix: string }) => {
  return (context: { group: string }) => {
    return camelCase(`${context.group}${options.suffix}`, {
      mergeAmbiguousCharacters: true,
    });
  };
};
