# @ovineko/spa-guard-react

[![npm](https://img.shields.io/npm/v/@ovineko/spa-guard-react)](https://www.npmjs.com/package/@ovineko/spa-guard-react)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-react)](./LICENSE)

React hooks, components, and error boundaries for [spa-guard](../spa-guard/README.md).

## Install

**pnpm** (recommended):

```bash
pnpm add @ovineko/spa-guard-react @ovineko/spa-guard react
```

**npm**:

```bash
npm install @ovineko/spa-guard-react @ovineko/spa-guard react
```

**yarn**:

```bash
yarn add @ovineko/spa-guard-react @ovineko/spa-guard react
```

**bun**:

```bash
bun add @ovineko/spa-guard-react @ovineko/spa-guard react
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-react npm:@ovineko/spa-guard npm:react
```

## Usage

```tsx
import { lazyWithRetry } from "@ovineko/spa-guard-react";

const LazyHome = lazyWithRetry(() => import("./pages/Home"));
```

## Documentation

Full documentation: [ovineko.com/docs/spa-guard/react](https://ovineko.com/docs/spa-guard/react)

## License

MIT
