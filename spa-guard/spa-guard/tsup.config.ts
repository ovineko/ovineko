import { exec } from "node:child_process";
import { promisify } from "node:util";
import tsup from "tsup";

const execAsync = promisify(exec);

export default tsup.defineConfig({
  clean: true,
  entry: [
    "src/common/index.ts",
    "src/runtime/index.ts",
    "src/runtime/debug/index.ts",
    "src/schema/index.ts",
    "src/schema/parse.ts",
    "src/i18n/index.ts",
    "src/_internal.ts",
  ],
  format: "esm",
  async onSuccess() {
    await execAsync("rm -f tsconfig.tsbuildinfo && pnpm exec tsc --emitDeclarationOnly");
  },
  splitting: true,
});
