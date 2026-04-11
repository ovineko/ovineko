import { definePlugin, getBarrelFiles, getMode } from "@kubb/core";
import { OperationGenerator, pluginOasName } from "@kubb/plugin-oas";
import path from "node:path";

import type { PluginScopes } from "./types.js";

import { scopesGenerator } from "./generators/scopes.js";

function camelCase(input: string): string {
  return input
    .replaceAll(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

export const pluginScopesName = "plugin-scopes" as const;

export const pluginScopes = definePlugin<PluginScopes>((options) => {
  const {
    group,
    importPath = "@ovineko/kubb-client/scopes",
    output = { barrelType: "named", path: "scopes" },
  } = options;

  return {
    async install() {
      const root = path.resolve(this.config.root, this.config.output.path);
      const mode = getMode(path.resolve(root, output.path));
      const oas = await this.getOas();

      const files = await new OperationGenerator<PluginScopes>(this.plugin.options, {
        contentType: undefined,
        events: this.events,
        exclude: undefined,
        fabric: this.fabric,
        include: undefined,
        mode,
        oas,
        override: undefined,
        plugin: this.plugin,
        pluginManager: this.pluginManager,
      }).build(scopesGenerator);

      await this.upsertFile(...files);

      const barrelFiles = await getBarrelFiles(this.fabric.files, {
        meta: { pluginKey: this.plugin.key },
        output,
        root,
        type: output.barrelType ?? "named",
      });

      await this.upsertFile(...barrelFiles);
    },
    name: pluginScopesName,
    options: {
      group,
      importPath,
      output,
    },
    pre: [pluginOasName],
    resolveName(name, type) {
      if (type === "file") {
        return camelCase(name);
      }

      return camelCase(name);
    },
    resolvePath(baseName, pathMode, options) {
      const root = path.resolve(this.config.root, this.config.output.path);

      if ((pathMode ?? getMode(path.resolve(root, output.path))) === "single") {
        return path.resolve(root, output.path);
      }

      if (group && options?.group?.tag) {
        const groupName = group.name ?? ((ctx: { group: string }) => ctx.group);

        return path.resolve(root, output.path, groupName({ group: options.group.tag }), baseName);
      }

      return path.resolve(root, output.path, baseName);
    },
  };
});
