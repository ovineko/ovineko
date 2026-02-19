import { exec } from "node:child_process";
import { promisify } from "node:util";
import tsup from "tsup";

const execAsync = promisify(exec);

export default tsup.defineConfig({
  clean: true,
  entry: [
    "src/common/index.ts",
    "src/react-error-boundary/index.tsx",
    "src/react/index.tsx",
    "src/schema/index.ts",
    "src/schema/parse.ts",
    "src/fastify/index.ts",
    "src/react-router/index.tsx",
    "src/vite-plugin/index.ts",
  ],
  format: "esm",
  async onSuccess() {
    await execAsync("rm -f tsconfig.tsbuildinfo && pnpm exec tsc --emitDeclarationOnly");
  },
  splitting: true,
});
