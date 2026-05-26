import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function setup() {
  const genDir = join(import.meta.dirname, "gen");

  if (!existsSync(genDir)) {
    const packageRoot = join(import.meta.dirname, "..");
    execSync("node ../kubb/bin/cli.js generate --config test-integration/kubb.config.ts", {
      cwd: packageRoot,
      stdio: "inherit",
    });
  }
}
