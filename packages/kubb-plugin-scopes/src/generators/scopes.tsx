import type { Generator } from "@kubb/plugin-oas/generators";

import { createReactGenerator } from "@kubb/plugin-oas/generators";
import { useOperationManager } from "@kubb/plugin-oas/hooks";
import { File, Function } from "@kubb/react-fabric";

import type { PluginScopes } from "../types.js";

import { extractScopes } from "../utils/extractScopes.js";

export const scopesGenerator: Generator<PluginScopes> = createReactGenerator<PluginScopes>({
  name: "plugin-scopes",
  Operation({ generator, operation, plugin }) {
    const { getFile, getName } = useOperationManager(generator);

    const scopes = extractScopes(operation);

    if (scopes.length === 0) {
      return null;
    }

    const name = getName(operation, { prefix: "get", suffix: "Scopes", type: "function" });
    const file = getFile(operation);
    const importPath = plugin.options.importPath;

    const scopeValues = scopes.map((s) => `scope("${s}")`).join(", ");

    return (
      <File baseName={file.baseName} path={file.path} {...(file.meta ? { meta: file.meta } : {})}>
        <File.Import isTypeOnly name={["ApiScope"]} path={importPath} />
        <File.Import name={["scope"]} path={importPath} />

        <File.Source isExportable isIndexable name={name}>
          <Function export name={name} returnType="ApiScope[]">
            {`return [${scopeValues}]`}
          </Function>
        </File.Source>
      </File>
    );
  },
});
