import type { Generator } from "@kubb/plugin-oas/generators";

import { createReactGenerator } from "@kubb/plugin-oas/generators";
import { useOperationManager } from "@kubb/plugin-oas/hooks";
import { File, Function } from "@kubb/react-fabric";

import type { PluginScopes } from "../types.js";

import { generateScopeCode } from "./scopeCodegen.js";

export const scopesGenerator: Generator<PluginScopes> = createReactGenerator<PluginScopes>({
  name: "plugin-scopes",
  Operation({ generator, operation, plugin }) {
    const { getFile, getName } = useOperationManager(generator);

    const result = generateScopeCode(operation, plugin.options.importPath);

    if (!result) {
      return null;
    }

    const name = getName(operation, { prefix: "get", suffix: "Scopes", type: "function" });
    const file = getFile(operation);

    return (
      <File baseName={file.baseName} path={file.path} {...(file.meta ? { meta: file.meta } : {})}>
        <File.Import isTypeOnly name={["ApiScope"]} path={result.importPath} />
        <File.Import name={["scope"]} path={result.importPath} />

        <File.Source isExportable isIndexable name={name}>
          <Function export name={name} returnType="ApiScope[]">
            {result.functionBody}
          </Function>
        </File.Source>
      </File>
    );
  },
});
