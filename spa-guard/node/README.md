# @ovineko/spa-guard-node

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard-node)](https://www.npmjs.com/package/@ovineko/spa-guard-node)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-node)](./LICENSE)

Server-side HTML cache for spa-guard — pre-compresses your SPA's HTML for all languages and serves it with ETag/304 and content-encoding negotiation.

## Install

```sh
npm install @ovineko/spa-guard-node @ovineko/spa-guard
npm install parse5
```

## Usage

Build the cache once at startup, then use `get()` on each request:

```ts
import { createHtmlCache } from "@ovineko/spa-guard-node";
import { readFile } from "node:fs/promises";

const html = await readFile("dist/index.html", "utf8");
const cache = await createHtmlCache({ html });

// In your request handler:
const { body, headers, statusCode } = cache.get({
  acceptEncoding: req.headers["accept-encoding"],
  acceptLanguage: req.headers["accept-language"],
  ifNoneMatch: req.headers["if-none-match"],
});
res.writeHead(statusCode, headers);
res.end(body);
```

With custom translations and language filter:

```ts
const cache = await createHtmlCache({
  html,
  languages: ["en", "ko", "ja"],
  translations: {
    ko: { heading: "서비스 점검 중입니다" },
  },
});
```

### Multiple pages with createHTMLCacheStore

```ts
import { createHTMLCacheStore } from "@ovineko/spa-guard-node";

const store = createHTMLCacheStore({
  main: () => readFile("dist/index.html", "utf8"),
  admin: () => readFile("dist/admin.html", "utf8"),
});

await store.load();

const cache = store.getCache("main");
```

### Server-side i18n patching

```ts
import { patchHtmlI18n } from "@ovineko/spa-guard-node";

const patched = patchHtmlI18n({
  html,
  acceptLanguage: req.headers["accept-language"],
});
```

## Builder API

Use the builder API to generate the spa-guard runtime script outside of Vite (e.g., in a custom build step or SSR framework):

```ts
import { buildSpaGuardScript, buildExternalScript } from "@ovineko/spa-guard-node";

// Inline script — returns script content and HTML tag strings
const { scriptContent, hash, html, tags } = await buildSpaGuardScript({
  version: "1.0.0",
  spinner: { background: "#f5f5f5" },
});

// External script — writes a content-hashed file to disk
const result = await buildExternalScript({
  outDir: "dist/assets",
  publicPath: "/assets",
  version: "1.0.0",
});
// result.publicUrl => '/assets/spa-guard.abc12345.js'
// result.html => ['<script src="/assets/spa-guard.abc12345.js"></script>', ...]
```

## API

- `buildSpaGuardScript(options?)` — builds the inline runtime script; returns `BuildScriptResult`
- `buildExternalScript(options)` — writes a content-hashed script file to `outDir`; returns `BuildExternalScriptResult`
- `BuildScriptOptions` — options for `buildSpaGuardScript` (extends core `Options`, adds `trace?: boolean`)
- `BuildExternalScriptOptions` — options for `buildExternalScript` (extends `BuildScriptOptions`, adds `outDir: string` and `publicPath?: string`)
- `BuildScriptResult` — `{ scriptContent, hash, html: string[], tags: HtmlTagDescriptor[] }`
- `BuildExternalScriptResult` — `{ fileName, publicUrl, html: string[], tags: HtmlTagDescriptor[] }`
- `HtmlTagDescriptor` — structured tag object `{ tag, attrs?, children?, injectTo }` for framework injection
- `createHtmlCache(options)` — builds a cache with gzip/brotli/zstd variants for all languages; returns an `HtmlCache` with a `get()` method
- `createHTMLCacheStore(input, languages?)` — manages multiple named caches; call `load()` once then `getCache(key)`
- `patchHtmlI18n(options)` — injects `<meta name="spa-guard-i18n">` and updates `<html lang>` for server-side rendering
- `matchLang(input, available?)` — resolves an Accept-Language value to a supported language code
- `translations` — built-in translation map (en, ko, ja, zh, fr, de, es, pt, ru, ar)

## Related packages

- [@ovineko/spa-guard](../spa-guard/README.md) — core runtime (install in your app entry)
- [@ovineko/spa-guard-vite](../vite/README.md) — Vite plugin that injects the runtime at build time
- [@ovineko/spa-guard-fastify](../fastify/README.md) — Fastify plugin built on this package
- [@ovineko/spa-guard-react](../react/README.md) — `lazyWithRetry` and React error boundary
- [@ovineko/spa-guard-react-router](../react-router/README.md) — React Router error boundary
- [@ovineko/spa-guard-eslint](../eslint/README.md) — ESLint rules

## License

MIT
