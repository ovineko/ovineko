import { exec } from "node:child_process";
import { promisify } from "node:util";
import tsup from "tsup";

const execAsync = promisify(exec);

export default tsup.defineConfig({
  clean: true,
  entry: [
    "src/kysely-ctl/index.ts",
    "src/kysely/index.ts",
    "src/kysely/helpers/postgres.ts",
    "src/kysely/helpers/mysql.ts",
    "src/kysely/helpers/mssql.ts",
    "src/kysely/helpers/sqlite.ts",
    "src/kysely-ctl/hooks/main.ts",
  ],
  format: "esm",
  async onSuccess() {
    await execAsync("rm -f tsconfig.tsbuildinfo && pnpm exec tsc --emitDeclarationOnly");
  },
  splitting: true,
});
