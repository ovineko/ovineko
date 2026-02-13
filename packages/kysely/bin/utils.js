import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const getBinaryFilepath = (
  /** @type {string} */ specifier,
  /** @type {string} */ path
) => {
  return join(fileURLToPath(import.meta.resolve(specifier)), path);
};
