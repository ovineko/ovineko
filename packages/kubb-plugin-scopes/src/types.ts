import type { Output, PluginFactoryOptions } from "@kubb/core";
import type { Oas } from "@kubb/oas";
import type { ResolvePathOptions } from "@kubb/plugin-oas";

export interface Options {
  /**
   * Group the generated scopes files based on the provided name.
   */
  group?: {
    /**
     * Return the name of a group based on the group name.
     */
    name?: (context: { group: string }) => string;
    type: "tag";
  };
  /**
   * Import path for `ApiScope` and `scope` helper.
   * Used as `import { ApiScope, scope } from '${importPath}'`.
   * @default '@ovineko/kubb-client/scopes'
   */
  importPath?: string;
  /**
   * Specify the export location for the files and define the behavior of the output.
   * @default { path: 'scopes', barrelType: 'named' }
   */
  output?: Output<Oas>;
}

export type PluginScopes = PluginFactoryOptions<
  "plugin-scopes",
  Options,
  ResolvedOptions,
  never,
  ResolvePathOptions
>;

interface ResolvedOptions {
  group: Options["group"];
  importPath: string;
  output: Output<Oas>;
}
