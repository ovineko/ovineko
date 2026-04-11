import type { Generator } from "@kubb/plugin-oas/generators";

import { createReactGenerator } from "@kubb/plugin-oas/generators";
import { useOperationManager } from "@kubb/plugin-oas/hooks";
import { File, Function } from "@kubb/react-fabric";
import path from "node:path";

import type { PluginScopes } from "../types.js";

import { generateSwrScopeCode } from "./swrScopeCodegen.js";

/**
 * Kubb React generator that creates SWR scoped hook wrappers for operations with OAuth/OIDC scopes.
 *
 * For each operation that has scopes (via extractScopes), generates a `use{OperationName}Scoped` hook
 * that wraps the original SWR hook with automatic scope checking via `useScopes().hasAccess()`.
 * Operations without scopes are skipped (no file generated).
 *
 * Only runs when `generateSwrWrappers: true` is set in plugin options.
 */
export const swrScopesGenerator: Generator<PluginScopes> = createReactGenerator<PluginScopes>({
  name: "plugin-scopes-swr",
  Operation({ generator, operation, plugin }) {
    const { getFile, getName } = useOperationManager(generator);

    const scopeGetterName = getName(operation, {
      prefix: "get",
      suffix: "Scopes",
      type: "function",
    });
    const result = generateSwrScopeCode(operation, scopeGetterName);

    if (!result) {
      return null;
    }

    const originalHookName = getName(operation, { prefix: "use", type: "function" });
    const scopedHookName = getName(operation, {
      prefix: "use",
      suffix: "Scoped",
      type: "function",
    });
    const scopesFile = getFile(operation);
    const scopesReactImportPath = plugin.options.scopesReactImportPath;
    const outputPath = path.normalize(plugin.options.output.path);
    const swrOutputPath = plugin.options.swrWrappersOutputPath;
    const file = {
      ...scopesFile,
      path: scopesFile.path.replace(`/${outputPath}/`, `/${swrOutputPath}/`),
    };

    const params =
      result.hookType === "query"
        ? `params?: Parameters<typeof originalHook>[0], options?: Omit<Parameters<typeof originalHook>[1], "shouldFetch"> & { shouldFetch?: boolean }`
        : `options?: Omit<Parameters<typeof originalHook>[0], "shouldFetch"> & { shouldFetch?: boolean }`;

    return (
      <File baseName={file.baseName} path={file.path} {...(file.meta ? { meta: file.meta } : {})}>
        <File.Import
          name={[{ name: "originalHook", propertyName: originalHookName }]}
          path="../hooks"
        />
        <File.Import name={[scopeGetterName]} path="../scopes" />
        <File.Import name={["useScopes"]} path={scopesReactImportPath} />

        <File.Source isExportable isIndexable name={scopedHookName}>
          <Function
            export
            name={scopedHookName}
            params={params}
            returnType="ReturnType<typeof originalHook>"
          >
            {result.functionBody}
          </Function>
        </File.Source>
      </File>
    );
  },
});
