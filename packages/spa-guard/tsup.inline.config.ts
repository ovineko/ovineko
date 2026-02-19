import tsup from "tsup";

export default tsup.defineConfig({
  clean: true,
  entry: ["src/inline/index.ts"],
  format: "esm",
  minify: "terser",
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  outDir: "dist-inline",
  platform: "browser",
  splitting: false,
  terserOptions: {
    compress: {
      drop_console: false, // у тебя console.log нужен? если нет — true
      passes: 3,
      pure_funcs: [],
      unsafe: true,
      unsafe_arrows: true,
      unsafe_methods: true,
    },
    format: {
      comments: false,
    },
    mangle: {
      toplevel: true, // мангл на верхнем уровне — важно!
    },
  },
});
