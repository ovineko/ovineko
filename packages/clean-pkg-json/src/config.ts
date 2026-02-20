export const FIELDS_WHITELIST = new Set([
  "author",
  "bin",
  "bugs",
  "dependencies",
  "description",
  "engines",
  "exports",
  "files",
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
  "type",
  "types",
  "version",
]);

export const SCRIPTS_WHITELIST = new Set(["install", "postinstall", "preinstall"]);

export const BACKUP_FILENAME = "package.json.backup";
