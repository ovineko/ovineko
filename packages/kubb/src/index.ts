import type { BarrelType, UserConfig } from "@kubb/core";

import { defineConfig as defineConfigLib } from "@kubb/core";

export type { ConfigOptions } from "./types";

import { pluginClient } from "@kubb/plugin-client";
import { pluginFaker } from "@kubb/plugin-faker";
import { pluginMsw } from "@kubb/plugin-msw";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginSwr } from "@kubb/plugin-swr";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

import type { ConfigOptions } from "./types";

import {
  createPluginOptions,
  defaultDisabledEslintRules,
  defaultOutputFooter,
  fixGroupName,
  getDefaultOutputBanner,
} from "./utils";

export const defineConfig = (options: ConfigOptions): ReturnType<typeof defineConfigLib> => {
  const disabledEslintRules = options.patch?.disabledEslintRules
    ? options.patch.disabledEslintRules(defaultDisabledEslintRules)
    : defaultDisabledEslintRules;

  const defaultOutputBanner = getDefaultOutputBanner(disabledEslintRules);

  const outputBanner = options.patch?.outputBanner
    ? options.patch.outputBanner(defaultOutputBanner)
    : defaultOutputBanner;

  const outputFooter = options.patch?.outputFooter
    ? options.patch.outputFooter(defaultOutputFooter)
    : defaultOutputFooter;

  const barrelType: BarrelType | false =
    options.barrelType === undefined ? false : options.barrelType;

  return defineConfigLib({
    ...options.config,
    hooks: options.config.hooks,
    output: {
      clean: true,
      ...options.config.output,
    },
    plugins: [
      !options.plugins?.oas?.disabled &&
        pluginOas(
          createPluginOptions(
            {
              output: {
                banner: outputBanner,
                barrelType,
                footer: outputFooter,
                path: "./schemas",
              },
            },
            options.plugins?.oas,
          ),
        ),
      !options.plugins?.ts?.disabled &&
        pluginTs(
          createPluginOptions(
            {
              enumType: "literal",
              output: {
                banner: outputBanner,
                barrelType,
                footer: outputFooter,
                path: "./types",
              },
            },
            options.plugins?.ts,
          ),
        ),
      options.plugins?.zod?.enabled && pluginZod(createPluginOptions({}, options.plugins.zod)),
      options.plugins?.client?.enabled &&
        pluginClient(
          createPluginOptions(
            {
              client: "fetch",
              dataReturnType: "full",
              exclude: [
                // {
                //   pattern: "store",
                //   type: "tag",
                // },
              ],
              group: {
                name: fixGroupName({ plugin: "client", suffix: "Service" }),
                type: "tag",
              },
              operations: true,
              output: {
                banner: outputBanner,
                barrelType,
                footer: outputFooter,
                path: "./api",
              },
              paramsType: "object",
              parser: "client",
              pathParamsType: "object",
              transformers: {
                name: (name) => {
                  return `${name}Client`;
                },
              },
            },
            options.plugins.client,
          ),
        ),
      !options.plugins?.swr?.disabled &&
        pluginSwr(
          createPluginOptions(
            {
              client: {
                dataReturnType: "full",
                importPath: "@kubb/plugin-client/clients/fetch",
              },
              group: {
                name: fixGroupName({ plugin: "swr", suffix: "Hooks" }),
                type: "tag",
              },
              output: {
                banner: outputBanner,
                barrelType,
                footer: outputFooter,
                path: "./hooks",
              },
              paramsType: "object",
              pathParamsType: "object",
              ...(options.plugins?.zod?.enabled ? { parser: "zod" } : {}),
            },
            options?.plugins?.swr,
          ),
        ),
      options.plugins?.msw?.enabled &&
        pluginMsw(
          createPluginOptions(
            {
              group: {
                name: fixGroupName({ plugin: "msw", suffix: "Service" }),
                type: "tag",
              },
              handlers: true,
              output: {
                banner: outputBanner,
                barrelType,
                footer: outputFooter,
                path: "./msw",
              },
            },
            options.plugins.msw,
          ),
        ),
      options.plugins?.faker?.enabled &&
        pluginFaker(
          createPluginOptions(
            {
              dateType: "string",
              group: {
                name: fixGroupName({ plugin: "faker", suffix: "Service" }),
                type: "tag",
              },
              output: {
                banner: outputBanner,
                barrelType,
                footer: outputFooter,
                path: "./mocks",
              },
              seed: [100],
              unknownType: "unknown",
            },
            options.plugins.faker,
          ),
        ),
      ...(options.plugins?.additional || []),
    ].reduce<Required<Pick<UserConfig, "plugins">>["plugins"]>((acc, el) => {
      if (el) {
        acc.push(el);
      }
      return acc;
    }, []),
  });
};
