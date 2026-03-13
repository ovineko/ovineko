# @ovineko/spa-guard

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard)](https://www.npmjs.com/package/@ovineko/spa-guard)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard)](./LICENSE)

Core runtime for spa-guard — chunk load error handling, version checking, spinner, i18n, and event schema for SPAs.

## Install

**pnpm** (recommended):

```bash
pnpm add @ovineko/spa-guard
```

**npm**:

```bash
npm install @ovineko/spa-guard
```

**yarn**:

```bash
yarn add @ovineko/spa-guard
```

**bun**:

```bash
bun add @ovineko/spa-guard
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard
```

## Usage

```ts
import { recommendedSetup } from "@ovineko/spa-guard/runtime";

const cleanup = recommendedSetup();
```

## Documentation

Full documentation: [ovineko.com/docs/spa-guard/core](https://ovineko.com/docs/spa-guard/core)

## License

MIT
