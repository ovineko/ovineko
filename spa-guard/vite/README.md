# @ovineko/spa-guard-vite

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard-vite)](https://www.npmjs.com/package/@ovineko/spa-guard-vite)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-vite)](./LICENSE)

Vite plugin for spa-guard — injects the runtime inline script and loading spinner into your SPA's HTML at build time.

## Install

```sh
npm install @ovineko/spa-guard-vite @ovineko/spa-guard
npm install --save-dev vite
```

## Usage

Add the plugin to your `vite.config.ts`:

```ts
import { spaGuardVitePlugin } from "@ovineko/spa-guard-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [spaGuardVitePlugin()],
});
```

With options:

```ts
export default defineConfig({
  plugins: [
    spaGuardVitePlugin({
      version: "1.0.0",
      reloadDelays: [1000, 3000, 10000],
      spinner: { background: "#f5f5f5" },
    }),
  ],
});
```

Disable the spinner:

```ts
spaGuardVitePlugin({ spinner: { disabled: true } });
```

Enable trace mode (logs extra debug info at runtime):

```ts
spaGuardVitePlugin({ trace: true });
```

Use external script mode to write a content-hashed `.js` file instead of inlining the script:

```ts
spaGuardVitePlugin({
  mode: "external",
  externalScriptDir: "dist/assets",
  publicPath: "/assets",
});
// Injects <script src="/assets/spa-guard.abc12345.js"> into the HTML
```

## Options

`VitePluginOptions` extends the core `Options` type and adds:

| Option                  | Type                     | Default      | Description                                              |
| ----------------------- | ------------------------ | ------------ | -------------------------------------------------------- |
| `mode`                  | `'inline' \| 'external'` | `'inline'`   | Inject script inline or write an external file           |
| `externalScriptDir`     | `string`                 | —            | Output directory for external mode (e.g., `dist/assets`) |
| `publicPath`            | `string`                 | `'/'`        | Public path prefix for the generated script URL          |
| `version`               | `string`                 | auto UUID    | Version string for cache busting                         |
| `reloadDelays`          | `number[]`               | —            | Retry delay sequence in ms                               |
| `useRetryId`            | `boolean`                | —            | Append retry ID to chunk URLs                            |
| `spinner.disabled`      | `boolean`                | `false`      | Disable loading spinner injection                        |
| `spinner.content`       | `string`                 | built-in SVG | Custom spinner HTML content                              |
| `spinner.background`    | `string`                 | `"#fff"`     | Spinner overlay background color                         |
| `html.fallback.content` | `string`                 | —            | Fallback HTML shown on error (auto-minified)             |
| `trace`                 | `boolean`                | `false`      | Use trace build with debug logging                       |

## What the plugin injects

In **inline mode** (default):

- A `<script>` in `<head>` (prepended) containing the full spa-guard runtime inline

In **external mode** (`mode: 'external'`):

- A `<script src="...">` in `<head>` (prepended) referencing the content-hashed file
- The content-hashed `.js` file is written to `externalScriptDir` (or Vite's `build.outDir`) during the bundle step

In both modes:

- A spinner `<div>` in `<body>` (prepended) that hides until your app loads
- A `<script>` to set `overflow: hidden` while loading
- A `<style>` for the spinner background CSS variable (only when background differs from `#fff`)

## Related packages

- [@ovineko/spa-guard](../spa-guard/README.md) — core runtime (install in your app entry)
- [@ovineko/spa-guard-node](../node/README.md) — Node.js builder API and HTML cache
- [@ovineko/spa-guard-react](../react/README.md) — `lazyWithRetry` and React error boundary
- [@ovineko/spa-guard-react-router](../react-router/README.md) — React Router error boundary
- [@ovineko/spa-guard-fastify](../fastify/README.md) — Fastify plugin
- [@ovineko/spa-guard-eslint](../eslint/README.md) — ESLint rules

## License

MIT
