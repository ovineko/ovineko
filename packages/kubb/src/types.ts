import type { BarrelType, UserConfig } from "@kubb/core";
import type { pluginClient } from "@kubb/plugin-client";
import type { pluginFaker } from "@kubb/plugin-faker";
import type { pluginMsw } from "@kubb/plugin-msw";
import type { pluginOas } from "@kubb/plugin-oas";
import type { pluginSwr } from "@kubb/plugin-swr";
import type { pluginTs } from "@kubb/plugin-ts";
import type { pluginZod } from "@kubb/plugin-zod";

export interface ConfigOptions {
  barrelType?: BarrelType | false;
  config: Omit<UserConfig, "plugins">;
  patch?: {
    disabledEslintRules?: (rules: string[]) => string[];
    outputBanner?: (banner: string) => string;
    outputFooter?: (footer: string) => string;
  };
  plugins?: {
    additional?: Required<Pick<UserConfig, "plugins">>["plugins"];
    client?: PluginOptionsEnabled<PluginClientOptions>;
    faker?: PluginOptionsEnabled<PluginFakerOptions>;
    msw?: PluginOptionsEnabled<PluginMswOptions>;
    oas?: PluginOptionsDisabled<PluginOasOptions>;
    swr?: PluginOptionsDisabled<PluginSwrOptions>;
    ts?: PluginOptionsDisabled<PluginTsOptions>;
    zod?: PluginOptionsEnabled<PluginZodOptions>;
  };
}
export type PluginClientOptions = Required<Parameters<typeof pluginClient>>[0];
export type PluginFakerOptions = Required<Parameters<typeof pluginFaker>>[0];
export type PluginMswOptions = Required<Parameters<typeof pluginMsw>>[0];
export type PluginOasOptions = Required<Parameters<typeof pluginOas>>[0];
export interface PluginOptions<T = unknown> {
  createOptions?: (options: T) => T;
}
export type PluginOptionsDisabled<T = unknown> = PluginOptions<T> & {
  disabled?: boolean;
};

export type PluginOptionsEnabled<T = unknown> = PluginOptions<T> & {
  enabled?: boolean;
};

export type PluginSwrOptions = Required<Parameters<typeof pluginSwr>>[0];

export type PluginTsOptions = Required<Parameters<typeof pluginTs>>[0];

export type PluginZodOptions = Required<Parameters<typeof pluginZod>>[0];
