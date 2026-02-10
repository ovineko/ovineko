import tsup from "tsup";

export default tsup.defineConfig({
  clean: true,
  entry: ["src/main.ts"],
  format: "esm",
  minify: true,
});
