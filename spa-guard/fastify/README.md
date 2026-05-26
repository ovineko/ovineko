# @ovineko/spa-guard-fastify

[![npm version](https://img.shields.io/npm/v/@ovineko/spa-guard-fastify)](https://www.npmjs.com/package/@ovineko/spa-guard-fastify)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-fastify)](./LICENSE)

Fastify plugin for spa-guard beacon endpoint and HTML cache handler with ETag/304 support.

## Install

**pnpm** (recommended):

```bash
pnpm add @ovineko/spa-guard-fastify @ovineko/spa-guard @ovineko/spa-guard-node fastify fastify-plugin
```

**npm**:

```bash
npm install @ovineko/spa-guard-fastify @ovineko/spa-guard @ovineko/spa-guard-node fastify fastify-plugin
```

**yarn**:

```bash
yarn add @ovineko/spa-guard-fastify @ovineko/spa-guard @ovineko/spa-guard-node fastify fastify-plugin
```

**bun**:

```bash
bun add @ovineko/spa-guard-fastify @ovineko/spa-guard @ovineko/spa-guard-node fastify fastify-plugin
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-fastify npm:@ovineko/spa-guard npm:@ovineko/spa-guard-node npm:fastify npm:fastify-plugin
```

## Usage

```ts
import Fastify from "fastify";
import { fastifySPAGuard } from "@ovineko/spa-guard-fastify";

const app = Fastify();
app.register(fastifySPAGuard, { path: "/api/beacon" });
```

## Documentation

Full documentation: [ovineko.com/docs/spa-guard/fastify](https://ovineko.com/docs/spa-guard/fastify)

## License

MIT
