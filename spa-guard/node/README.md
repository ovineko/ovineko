# @ovineko/spa-guard-node

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard-node)](https://www.npmjs.com/package/@ovineko/spa-guard-node)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-node)](./LICENSE)

Server-side HTML cache for spa-guard — pre-compresses your SPA's HTML for all languages and serves it with ETag/304 and content-encoding negotiation.

## Install

**pnpm** (recommended):

```bash
pnpm add @ovineko/spa-guard-node @ovineko/spa-guard parse5
```

**npm**:

```bash
npm install @ovineko/spa-guard-node @ovineko/spa-guard parse5
```

**yarn**:

```bash
yarn add @ovineko/spa-guard-node @ovineko/spa-guard parse5
```

**bun**:

```bash
bun add @ovineko/spa-guard-node @ovineko/spa-guard parse5
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-node npm:@ovineko/spa-guard npm:parse5
```

## Usage

```ts
import { createHtmlCache } from "@ovineko/spa-guard-node";
import { readFile } from "node:fs/promises";

const html = await readFile("dist/index.html", "utf8");
const cache = await createHtmlCache({ html });
```

## Documentation

Full documentation: [ovineko.com/docs/spa-guard/node](https://ovineko.com/docs/spa-guard/node)

## License

MIT
