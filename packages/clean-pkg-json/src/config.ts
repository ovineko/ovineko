export const FIELDS_WHITELIST = new Set([
  "author",
  "bin",
  "bugs",
  "bundledDependencies",
  "bundleDependencies",
  "dependencies",
  "description",
  "engines",
  "exports",
  "files",
  "funding",
  "homepage",
  "keywords",
  "license",
  "main",
  "module",
  "name",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
  "publishConfig",
  "repository",
  "sideEffects",
  "type",
  "types",
  "version",
]);

export const SCRIPTS_WHITELIST = new Set(["install", "postinstall", "preinstall"]);

export const BACKUP_FILENAME = "package.json.backup";
