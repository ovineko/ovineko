import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

import { BACKUP_FILENAME } from "./config";

export function restore(): void {
  const pkgPath = resolve("package.json");
  const backupPath = resolve(BACKUP_FILENAME);

  if (!existsSync(backupPath)) {
    console.error(`❌ ${BACKUP_FILENAME} not found`);
    process.exit(1);
  }

  renameSync(backupPath, pkgPath);
  console.log("✓ package.json restored");
}
