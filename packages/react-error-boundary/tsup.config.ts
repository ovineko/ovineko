import tsup from "tsup";

export default tsup.defineConfig({
  clean: true,
  entry: ["src/**/*.tsx*", "!src/**/*.spec.tsx*", "!src/**/*.test.tsx*"],
  format: "esm",
  splitting: true,
});
