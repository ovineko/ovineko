import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { BACKUP_FILENAME, FIELDS_WHITELIST, SCRIPTS_WHITELIST } from "./config";

export function clean(): void {
  const pkgPath = resolve("package.json");
  const backupPath = resolve(BACKUP_FILENAME);

  if (existsSync(backupPath)) {
    console.error(`❌ ${BACKUP_FILENAME} already exists`);
    process.exit(1);
  }

  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  copyFileSync(pkgPath, backupPath);

  for (const key of Object.keys(pkg)) {
    if (key === "scripts") {
      const scripts = pkg.scripts as Record<string, string>;

      for (const script of Object.keys(scripts)) {
        if (!SCRIPTS_WHITELIST.has(script)) {
          delete scripts[script];
        }
      }

      if (Object.keys(scripts).length === 0) {
        delete pkg.scripts;
      }

      continue;
    }

    if (!FIELDS_WHITELIST.has(key)) {
      delete pkg[key];
    }
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log("✓ package.json cleaned");
}
