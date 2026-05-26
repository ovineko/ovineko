# @ovineko/spa-guard-eslint

[![npm version](https://img.shields.io/npm/v/@ovineko/spa-guard-eslint)](https://www.npmjs.com/package/@ovineko/spa-guard-eslint)
[![license](https://img.shields.io/npm/l/@ovineko/spa-guard-eslint)](./LICENSE)

ESLint plugin with rules that enforce spa-guard usage patterns: `no-direct-lazy` and `no-direct-error-boundary`.

## Install

**pnpm** (recommended):

```bash
pnpm add -D @ovineko/spa-guard-eslint eslint
```

**npm**:

```bash
npm install --save-dev @ovineko/spa-guard-eslint eslint
```

**yarn**:

```bash
yarn add -D @ovineko/spa-guard-eslint eslint
```

**bun**:

```bash
bun add -d @ovineko/spa-guard-eslint eslint
```

**deno**:

```bash
deno add npm:@ovineko/spa-guard-eslint npm:eslint
```

## Usage

```js
import spaGuard from "@ovineko/spa-guard-eslint";

export default [spaGuard.configs.recommended];
```

## Documentation

Full documentation: [ovineko.com/docs/spa-guard/eslint](https://ovineko.com/docs/spa-guard/eslint)

## License

MIT
