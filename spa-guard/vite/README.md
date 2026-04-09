# @ovineko/spa-guard-vite

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard-vite)](https://www.npmjs.com/package/@ovineko/spa-guard-vite)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-vite)](./LICENSE)

Vite plugin for spa-guard — injects the runtime inline script and loading spinner into your SPA's HTML at build time.

## Install

**pnpm** (recommended):

```bash
pnpm add -D @ovineko/spa-guard-vite
pnpm add @ovineko/spa-guard
```

**npm**:

```bash
npm install --save-dev @ovineko/spa-guard-vite
npm install @ovineko/spa-guard
```

**yarn**:

```bash
yarn add -D @ovineko/spa-guard-vite
yarn add @ovineko/spa-guard
```

**bun**:

```bash
bun add -d @ovineko/spa-guard-vite
bun add @ovineko/spa-guard
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-vite npm:@ovineko/spa-guard
```

## Usage

```ts
import { spaGuardVitePlugin } from "@ovineko/spa-guard-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [spaGuardVitePlugin()],
});
```

## Documentation

Full documentation: [ovineko.com/docs/spa-guard/vite](https://ovineko.com/docs/spa-guard/vite)

## License

MIT
