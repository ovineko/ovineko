import { exec } from "node:child_process";
import { promisify } from "node:util";
import tsup from "tsup";

const execAsync = promisify(exec);

export default tsup.defineConfig({
  clean: true,
  entry: ["src/index.ts"],
  format: "esm",
  async onSuccess() {
    await execAsync("rm -f tsconfig.tsbuildinfo && pnpm exec tsc --emitDeclarationOnly");
  },
  splitting: true,
});
